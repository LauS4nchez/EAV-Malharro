'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { API_URL, API_TOKEN } from '@/app/config';
import { checkUserRole } from '@/app/componentes/validacion/checkRole';
import styles from '@/styles/components/Construccion/Footer.module.css';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

// single type
const FOOTER_BASE_URL = `${API_URL}/footer`;

const SAFE_POPULATE =
  '?populate=img_ilustracion&populate=logo_principal&populate[redes][populate]=icono';

const getBrowserJwt = () =>
  typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;

const toAbs = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL.replace('/api', '')}${url}`;
};

const getMediaUrl = (media) => {
  if (!media) return null;
  if (typeof media === 'string') return toAbs(media);
  if (media.url) return toAbs(media.url);
  if (media.data?.attributes?.url) return toAbs(media.data.attributes.url);
  if (media.attributes?.url) return toAbs(media.attributes.url);
  return null;
};

const isValidUrl = (u) => {
  if (!u) return false;
  const v = u.trim();
  if (/^https?:\/\//i.test(v)) return true;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(v)) return true;
  return false;
};

const cleanUrl = (u) => {
  if (!u) return u;
  const v = u.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
};

// si la red vino solo con id de media, lo traemos
const fetchMediaById = async (id, token) => {
  try {
    const res = await fetch(`${API_URL}/upload/files/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.url ? toAbs(json.url) : null;
  } catch {
    return null;
  }
};

export default function FooterPage() {
  const [footerData, setFooterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editData, setEditData] = useState({
    mensaje_principal: '',
    direccion: '',
    link_campus: '',
    texto_boton_campus: '',
    img_ilustracion: null,
    logo_principal: null,
    img_ilustracion_preview: null,
    logo_principal_preview: null,
  });

  const [editRedes, setEditRedes] = useState([]);
  const [editErrors, setEditErrors] = useState({ footer: {}, redes: {} });
  const [saving, setSaving] = useState(false);

  // ========= 1) TRAER FOOTER con varios intentos =========
  const fetchFooter = useCallback(async () => {
    setFetchError('');
    const ts = Date.now();
    const jwt = getBrowserJwt();
    const token = jwt || API_TOKEN || null;

    // 3 intentos, del más específico al más simple
    const attempts = [
      // 1) el que deberías usar para tu schema
      `${FOOTER_BASE_URL}${SAFE_POPULATE}&_=${ts}`,
      // 2) un deep por si el de arriba falla
      `${FOOTER_BASE_URL}?populate=deep,3&_=${ts}`,
      // 3) sin populate
      `${FOOTER_BASE_URL}?_=${ts}`,
    ];

    let finalData = null;

    for (const url of attempts) {
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        const text = await res.text();

        let json;
        try {
          json = JSON.parse(text);
        } catch {
          continue; // pruebo el siguiente
        }

        if (!res.ok) {
          // si es el error que te tiró Strapi, paso al siguiente
          if (json?.error?.message?.includes('Invalid key')) {
            continue;
          }
          continue;
        }

        // single type
        let attrs = null;
        if (json?.data?.attributes) {
          attrs = json.data.attributes;
          if (json.data.documentId) attrs.documentId = json.data.documentId;
        } else if (json?.data) {
          attrs = json.data;
        } else {
          attrs = json;
        }

        finalData = attrs;
        break;
      } catch (err) {
        // sigo probando
        continue;
      }
    }

    if (!finalData) {
      setFooterData(null);
      setFetchError('No se pudo leer el footer. Revisá el GET y el populate en Strapi.');
      return null;
    }

    // 👇 completar iconos de redes que llegan solo con id
    const redes = Array.isArray(finalData.redes) ? finalData.redes : [];
    const redesCompletas = await Promise.all(
      redes.map(async (r) => {
        const currentUrl = getMediaUrl(r.icono);
        if (currentUrl) {
          return {
            ...r,
            icono: {
              ...(r.icono || {}),
              url: currentUrl,
            },
          };
        }
        // si vino solo id
        const iconId =
          typeof r.icono === 'number'
            ? r.icono
            : r.icono?.id
            ? r.icono.id
            : null;
        if (!iconId) {
          return { ...r, icono: null };
        }
        const mediaUrl = await fetchMediaById(iconId, token);
        if (!mediaUrl) return { ...r, icono: null };
        return {
          ...r,
          icono: {
            id: iconId,
            url: mediaUrl,
          },
        };
      })
    );

    setFooterData({
      ...finalData,
      redes: redesCompletas,
    });
    return finalData;
  }, []);

  // init
  useEffect(() => {
    (async () => {
      await fetchFooter();
      setLoading(false);
    })();
  }, [fetchFooter]);

  // rol admin/superadmin
  useEffect(() => {
    (async () => {
      try {
        const ok = await checkUserRole(['Administrador', 'SuperAdministrador']);
        setCanEdit(!!ok);
      } catch {
        setCanEdit(false);
      }
    })();
  }, []);

  // ========= 2) VALIDACIÓN =========
  const validateFooter = (data) => {
    const errs = {};
    if (!(data.mensaje_principal || '').trim())
      errs.mensaje_principal = 'El mensaje principal es obligatorio.';
    if (!(data.direccion || '').trim())
      errs.direccion = 'La dirección es obligatoria.';
    if (!(data.link_campus || '').trim())
      errs.link_campus = 'El link del campus es obligatorio.';
    else if (!isValidUrl(data.link_campus))
      errs.link_campus = 'La URL no es válida.';
    if (!(data.texto_boton_campus || '').trim())
      errs.texto_boton_campus = 'El texto del botón es obligatorio.';
    return errs;
  };

  const validateRedes = (redes) => {
    const errs = {};
    const nombres = redes
      .filter((r) => !r._delete)
      .map((r) => (r.nombre || '').trim().toLowerCase());
    const dups = nombres.filter((n, i) => n && nombres.indexOf(n) !== i);

    redes.forEach((r, i) => {
      if (r._delete) return;
      const e = {};
      if (!(r.nombre || '').trim()) e.nombre = 'Poné un nombre.';
      else if (dups.includes((r.nombre || '').trim().toLowerCase()))
        e.nombre = 'Nombre repetido.';
      if (!(r.url || '').trim()) e.url = 'Poné la URL.';
      else if (!isValidUrl(r.url)) e.url = 'La URL no es válida.';
      if (Object.keys(e).length) errs[i] = e;
    });

    return errs;
  };

  // ========= 3) ABRIR MODAL =========
  const handleEditClick = () => {
    if (!canEdit) {
      toast.error('Necesitás rol "Administrador" o "SuperAdministrador" para editar el footer.');
      return;
    }

    const d = footerData || {};

    const modalData = {
      mensaje_principal: d.mensaje_principal || 'Educación pública con identidad',
      direccion:
        d.direccion || 'La Pampa 1619, Mar del Plata, Argentina. 7600',
      link_campus:
        d.link_campus || 'https://esavmamalharro-bue.infd.edu.ar/',
      texto_boton_campus: d.texto_boton_campus || 'CAMPUS',
      img_ilustracion: null,
      logo_principal: null,
      img_ilustracion_preview: getMediaUrl(d.img_ilustracion) || null,
      logo_principal_preview: getMediaUrl(d.logo_principal) || null,
    };

    const redesOrigen = Array.isArray(d.redes) ? d.redes : [];
    const redesEditables = redesOrigen.map((r) => ({
      id: r.id || null,
      nombre: r.nombre || '',
      url: r.url || '',
      iconoId:
        r.icono?.data?.id ||
        r.icono?.id ||
        (typeof r.icono === 'number' ? r.icono : null) ||
        null,
      iconoUrl: getMediaUrl(r.icono) || null,
      iconoFile: null,
      _delete: false,
    }));

    setEditData(modalData);
    setEditRedes(redesEditables);
    setEditErrors({ footer: {}, redes: {} });
    setEditing(true);
  };

  const handleCancelEdit = () => setEditing(false);

  // ========= 4) HANDLERS FORM =========
  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...editData, [name]: value };
    setEditData(next);
    setEditErrors((prev) => ({ ...prev, footer: validateFooter(next) }));
  };

  const handleFileChange = (field, file) => {
    if (!file) {
      setEditData((prev) => ({
        ...prev,
        [field]: null,
        [`${field}_preview`]: prev[`${field}_preview`] || null,
      }));
      return;
    }
    const preview = URL.createObjectURL(file);
    setEditData((prev) => ({
      ...prev,
      [field]: file,
      [`${field}_preview`]: preview,
    }));
  };

  const handleAddRed = () => {
    setEditRedes((prev) => [
      ...prev,
      {
        id: null,
        nombre: '',
        url: '',
        iconoId: null,
        iconoUrl: null,
        iconoFile: null,
        _delete: false,
      },
    ]);
  };

  const handleRemoveRed = (i) => {
    setEditRedes((prev) => {
      const item = prev[i];
      if (item.id) {
        const next = [...prev];
        next[i] = { ...item, _delete: true };
        return next;
      }
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleRedChange = (index, field, value) => {
    setEditRedes((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
    const next = editRedes.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    );
    setEditErrors((prev) => ({
      ...prev,
      redes: validateRedes(next),
    }));
  };

  const handleIconChange = (index, file) => {
    setEditRedes((prev) => {
      const next = [...prev];
      const preview = file ? URL.createObjectURL(file) : next[index].iconoUrl;
      next[index] = {
        ...next[index],
        iconoFile: file,
        iconoUrl: preview,
      };
      return next;
    });
  };

  // ========= 5) GUARDAR =========
  const handleSave = async (e) => {
    e?.preventDefault();

    const footerErrs = validateFooter(editData);
    const redesErrs = validateRedes(editRedes);

    if (Object.keys(footerErrs).length || Object.keys(redesErrs).length) {
      setEditErrors({ footer: footerErrs, redes: redesErrs });
      toast.error('Revisá los campos con error.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Guardando footer...');

    const jwt = getBrowserJwt();
    const token = jwt || API_TOKEN || null;

    if (!token) {
      toast.error('No hay sesión para guardar.', { id: toastId });
      setSaving(false);
      return;
    }

    try {
      // subir ilustracion
      let ilustracionId =
        footerData?.img_ilustracion?.data?.id ||
        footerData?.img_ilustracion?.id ||
        null;
      if (editData.img_ilustracion instanceof File) {
        const form = new FormData();
        form.append('files', editData.img_ilustracion);
        const up = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const upJson = await up.json().catch(() => null);
        if (up.ok && upJson?.[0]?.id) {
          ilustracionId = upJson[0].id;
        }
      }

      // subir logo
      let logoId =
        footerData?.logo_principal?.data?.id ||
        footerData?.logo_principal?.id ||
        null;
      if (editData.logo_principal instanceof File) {
        const form = new FormData();
        form.append('files', editData.logo_principal);
        const up = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const upJson = await up.json().catch(() => null);
        if (up.ok && upJson?.[0]?.id) {
          logoId = upJson[0].id;
        }
      }

      // subir iconos de redes
      const redesFinal = [];
      for (const red of editRedes) {
        if (red._delete) continue;

        let iconoId = red.iconoId || null;

        if (red.iconoFile instanceof File) {
          const form = new FormData();
          form.append('files', red.iconoFile);
          const up = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          const upJson = await up.json().catch(() => null);
          if (up.ok && upJson?.[0]?.id) {
            iconoId = upJson[0].id;
          }
        }

        // 👇 importante: repeatable component → NO mandar id del componente
        redesFinal.push({
          nombre: (red.nombre || '').trim(),
          url: cleanUrl(red.url || ''),
          icono: iconoId ?? null,
        });
      }

      const body = {
        data: {
          mensaje_principal: editData.mensaje_principal.trim(),
          direccion: editData.direccion.trim(),
          link_campus: cleanUrl(editData.link_campus),
          texto_boton_campus: editData.texto_boton_campus.trim(),
          redes: redesFinal,
        },
      };

      if (ilustracionId) body.data.img_ilustracion = ilustracionId;
      if (logoId) body.data.logo_principal = logoId;

      const put = await fetch(FOOTER_BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const putJson = await put.json().catch(() => null);
      if (!put.ok) {
        throw new Error(
          putJson?.error?.message || `Error ${put.status} al guardar footer`
        );
      }

      // re-traer con populate seguro
      await fetchFooter();
      setEditing(false);
      toast.success('Footer actualizado correctamente.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // ========= 6) RENDER =========
  const mensajePrincipal =
    footerData?.mensaje_principal ||
    'Educación  \npública con  \nidentidad';
  const direccion =
    footerData?.direccion || 'La Pampa 1619, Mar del Plata, Argentina. 7600';
  const linkCampus =
    footerData?.link_campus ||
    'https://esavmamalharro-bue.infd.edu.ar/';
  const textoBotonCampus =
    footerData?.texto_boton_campus ?? 'CAMPUS';
  const ilustracionUrl =
    getMediaUrl(footerData?.img_ilustracion) ||
    '/img/Personajes_Footer_Prueba.svg';
  const logoPrincipalUrl =
    getMediaUrl(footerData?.logo_principal) || '/img/Logo_Malharro.svg';

  const redes =
    Array.isArray(footerData?.redes) && footerData.redes.length > 0
      ? footerData.redes.filter((r) => getMediaUrl(r.icono))
      : [];

  if (loading) {
    return (
      <footer className={styles.footerMalharro}>
        <p className="text-center text-white py-4">Cargando footer...</p>
      </footer>
    );
  }

  return (
    <>
      <footer className={styles.footerMalharro}>
        {fetchError && (
          <div className={styles.footerErrorBox}>
            <p>{fetchError}</p>
          </div>
        )}

        <div className={styles.footerFormaCurva}>
          <svg
            viewBox="0 0 360 150"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 0C73 0 146 10 214 30C267 47 316 69 360 95V150H0V0Z"
              fill="#1B1B1B"
            />
          </svg>
        </div>

        <div className="container-fluid">
          <div className={styles.contenidoFooter}>
            {/* subir */}
            <div className={`${styles.footerScroll} text-end mb-3`}>
              <a href="#" className={styles.footerScrollBtn} aria-label="Ir arriba">
                <img src="/img/Icon_SubirFooter.svg" alt="Subir" />
              </a>
            </div>

            {/* editar */}
            {canEdit && (
              <div className="text-end mb-2">
                <button
                  type="button"
                  className={styles.footerEditBtn}
                  onClick={handleEditClick}
                >
                  Editar footer
                </button>
              </div>
            )}

            {/* mobile */}
            <div className="col-12 d-md-none text-left">
              <div className={`${styles.footerFrase} h1-titulor`}>
                <ReactMarkdown>{mensajePrincipal}</ReactMarkdown>
              </div>

              <div>
                <img
                  src={ilustracionUrl}
                  alt="Decoración"
                  className="img-fluid"
                />
              </div>

              <div className={`${styles.logoCampus} d-flex align-items-center gap-3`}>
                <div>
                  <img
                    src={logoPrincipalUrl}
                    alt="Logo Malharro"
                    className={`${styles.footerCampusLogo} img-fluid`}
                  />
                </div>
                <div className={styles.footerCampus}>
                  <a
                    href={linkCampus}
                    className={styles.footerCampusLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {textoBotonCampus}
                  </a>
                </div>
              </div>
            </div>

            {/* desktop */}
            <div className="col-md-6 d-none d-md-flex align-items-center gap-3">
              <img
                src={ilustracionUrl}
                alt="Ilustración footer"
                className="img-fluid"
                style={{ maxHeight: '100px' }}
              />
              <div className={`${styles.footerFrase} m-0`}>
                <ReactMarkdown>{mensajePrincipal}</ReactMarkdown>
              </div>
            </div>

            <div className="col-md-6 mt-4 d-none d-md-block text-start">
              <div>
                <img
                  src={logoPrincipalUrl}
                  alt="Logo Malharro"
                  className={`${styles.footerCampusLogo} img-fluid`}
                />
              </div>
            </div>

            {/* dirección */}
            <div className="row">
              <div className="col-12 text-left">
                <p className={styles.footerDireccion}>{direccion}</p>
              </div>
            </div>

            {/* redes: solo media */}
            <div className={styles.footerSocial}>
              {redes.length > 0 ? (
                redes.map((r, idx) => {
                  const iconUrl = getMediaUrl(r.icono);
                  if (!iconUrl) return null;
                  const isStrapiIcon = iconUrl.includes('/uploads/');
                  return (
                    <a
                      key={r.url || r.nombre || idx}
                      href={r.url ? cleanUrl(r.url) : '#'}
                      target={r.url ? '_blank' : '_self'}
                      rel="noreferrer noopener"
                      title={r.nombre || ''}
                    >
                      <img
                        src={iconUrl}
                        alt={r.nombre || 'Red social'}
                        className={styles.footerSocialIcon}
                        style={{
                          width: '38px',
                          height: '38px',
                          objectFit: 'contain',
                          ...(isStrapiIcon ? { filter: 'invert(1)' } : {}),
                        }}
                      />
                    </a>
                  );
                })
              ) : (
                <>
                  <a
                    href="https://www.facebook.com/avmalharro/"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <img src="/img/Icon_Facebook.svg" alt="Facebook" />
                  </a>
                  <a
                    href="https://www.instagram.com/avmartinmalharro/?hl=es"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <img src="/img/Icon_Instagram.svg" alt="Instagram" />
                  </a>
                  <a
                    href="https://x.com/avmalharro"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <img src="/img/Icon_Twitter.svg" alt="Twitter / X" />
                  </a>
                  <a
                    href="https://www.youtube.com/@AVMartinMalharroOK"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <img src="/img/Icon_YT.svg" alt="YouTube" />
                  </a>
                </>
              )}
            </div>

            {/* logos fijos */}
            <div className={styles.footerLogos}>
              <div className="container-fluid">
                <div className="row justify-content-center align-items-center">
                  <div className="col-auto">
                    <img
                      src="/img/Logo_Educ_Art.svg"
                      alt="Logo Educación Artística"
                      className={`${styles.footerLogo} img-fluid`}
                    />
                  </div>
                  <div className="col-auto">
                    <img
                      src="/img/Logo_Direcc_BsAs.svg"
                      alt="Logo Dirección Cultura"
                      className={`${styles.footerLogo} img-fluid`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* créditos */}
            <div className="row">
              <div className="col-12 text-left">
                <p className={styles.footerCreditos}>
                  2025 © ESCUELA DE ARTES VISUALES MARTÍN A. MALHARRO | Sitio
                  diseñado por alumn@s de la carrera de Diseño Gráfico 4ºA y
                  desarrollado por Sánchez Lautaro y Sánchez Brian.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL */}
      {editing && (
        <div className={styles.footerEditOverlay}>
          <div className={styles.footerEditModal}>
            <div className={styles.footerEditHeader}>
              <h3>Editar Footer</h3>
              <button
                type="button"
                onClick={handleCancelEdit}
                className={styles.footerEditClose}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className={styles.footerEditForm}>
              <label className={styles.footerEditLabel}>
                Mensaje principal (Markdown):
                <textarea
                  name="mensaje_principal"
                  value={editData.mensaje_principal}
                  onChange={handleChange}
                  rows={4}
                  className={styles.footerEditTextarea}
                  style={{ background: '#fff', color: '#000' }}
                />
                {editErrors.footer?.mensaje_principal && (
                  <p className={styles.footerEditError}>
                    {editErrors.footer.mensaje_principal}
                  </p>
                )}
              </label>

              <label className={styles.footerEditLabel}>
                Dirección:
                <input
                  type="text"
                  name="direccion"
                  value={editData.direccion}
                  onChange={handleChange}
                  className={styles.footerEditInput}
                  style={{ background: '#fff', color: '#000' }}
                />
                {editErrors.footer?.direccion && (
                  <p className={styles.footerEditError}>
                    {editErrors.footer.direccion}
                  </p>
                )}
              </label>

              <label className={styles.footerEditLabel}>
                Link campus:
                <input
                  type="text"
                  name="link_campus"
                  value={editData.link_campus}
                  onChange={handleChange}
                  className={styles.footerEditInput}
                  style={{ background: '#fff', color: '#000' }}
                />
                {editErrors.footer?.link_campus && (
                  <p className={styles.footerEditError}>
                    {editErrors.footer.link_campus}
                  </p>
                )}
              </label>

              <label className={styles.footerEditLabel}>
                Texto botón campus:
                <input
                  type="text"
                  name="texto_boton_campus"
                  value={editData.texto_boton_campus}
                  onChange={handleChange}
                  className={styles.footerEditInput}
                  style={{ background: '#fff', color: '#000' }}
                />
                {editErrors.footer?.texto_boton_campus && (
                  <p className={styles.footerEditError}>
                    {editErrors.footer.texto_boton_campus}
                  </p>
                )}
              </label>

              <div className={styles.footerEditMediaRow}>
                <div>
                  <p className={styles.footerEditSubTitle}>Ilustración:</p>
                  {editData.img_ilustracion_preview ? (
                    <img
                      src={editData.img_ilustracion_preview}
                      alt="Ilustración"
                      className={styles.footerEditMediaPreview}
                    />
                  ) : (
                    <span className={styles.footerEditMediaPlaceholder}>
                      Sin ilustración
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange(
                        'img_ilustracion',
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </div>

                <div>
                  <p className={styles.footerEditSubTitle}>Logo principal:</p>
                  {editData.logo_principal_preview ? (
                    <img
                      src={editData.logo_principal_preview}
                      alt="Logo"
                      className={styles.footerEditMediaPreview}
                    />
                  ) : (
                    <span className={styles.footerEditMediaPlaceholder}>
                      Sin logo
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange(
                        'logo_principal',
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </div>
              </div>

              <div className={styles.footerEditRedesBox}>
                <div className={styles.footerEditRedesHeader}>
                  <h4>Redes sociales</h4>
                  <button
                    type="button"
                    onClick={handleAddRed}
                    className={styles.footerEditAddRed}
                  >
                    + Agregar red
                  </button>
                </div>

                {editRedes.length === 0 && (
                  <p className={styles.footerEditRedesEmpty}>
                    No hay redes cargadas.
                  </p>
                )}

                {editRedes.map((red, index) => {
                  const redErr = editErrors.redes?.[index] || {};
                  if (red._delete) {
                    return (
                      <div key={index} className={styles.footerEditRedDeleted}>
                        <span>{red.nombre || 'Red'} (se va a borrar)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRed(index)}
                          className={styles.footerEditUndo}
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className={styles.footerEditRedItem}>
                      <div className={styles.footerEditRedRow}>
                        <input
                          type="text"
                          placeholder="Nombre"
                          value={red.nombre}
                          onChange={(e) =>
                            handleRedChange(index, 'nombre', e.target.value)
                          }
                          className={styles.footerEditInput}
                          style={{ background: '#fff', color: '#000' }}
                        />
                        {redErr.nombre && (
                          <p className={styles.footerEditError}>{redErr.nombre}</p>
                        )}

                        <input
                          type="text"
                          placeholder="https://..."
                          value={red.url}
                          onChange={(e) =>
                            handleRedChange(index, 'url', e.target.value)
                          }
                          className={styles.footerEditInput}
                          style={{ background: '#fff', color: '#000' }}
                        />
                        {redErr.url && (
                          <p className={styles.footerEditError}>{redErr.url}</p>
                        )}
                      </div>

                      <div className={styles.footerEditRedRow}>
                        {red.iconoUrl ? (
                          <img
                            src={red.iconoUrl}
                            alt={red.nombre}
                            className={styles.footerEditRedIconPreview}
                          />
                        ) : (
                          <span className={styles.footerEditRedIconPlaceholder}>
                            Sin icono
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleIconChange(index, e.target.files?.[0] || null)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveRed(index)}
                          className={styles.footerEditRemoveRed}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.footerEditActions}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className={styles.footerEditCancel}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.footerEditSave}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>

            <p className={styles.footerEditNote}>
              Necesitás rol <strong>Administrador</strong> o <strong>SuperAdministrador</strong> para editar este footer.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
