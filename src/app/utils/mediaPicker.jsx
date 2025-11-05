import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const openMediaPicker = async (options = {}) => {
  const {
    allowEditing = false,
    quality = 90,
    source = CameraSource.Photos,
    resultType = CameraResultType.DataUrl
  } = options;

  if (!isNativePlatform()) {
    // Para web - mantener igual
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';
      input.multiple = false;
      
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          resolve({
            file,
            dataUrl: URL.createObjectURL(file),
            webPath: URL.createObjectURL(file)
          });
        } else {
          resolve(null);
        }
      };
      
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // PARA APP NATIVA - versión simplificada
  try {
    const image = await Camera.getPhoto({
      quality,
      allowEditing,
      resultType,
      source,
      correctOrientation: true
    });

    if (!image) return null;

    console.log('Camera result:', image);

    // Crear File object de manera más directa
    let file;
    if (image.dataUrl) {
      // Convertir dataUrl a blob y luego a File
      const response = await fetch(image.dataUrl);
      const blob = await response.blob();
      
      file = new File([blob], `captured_${Date.now()}.jpg`, {
        type: blob.type || 'image/jpeg',
        lastModified: Date.now()
      });
    }

    console.log('File creado:', file);

    return {
      file,
      dataUrl: image.dataUrl,
      webPath: image.webPath,
      format: image.format
    };

  } catch (error) {
    if (error.message.includes('cancelled')) {
      console.log('Usuario canceló');
      return null;
    }
    console.error('Error en media picker:', error);
    throw error;
  }
};

// AÑADE ESTA FUNCIÓN QUE FALTABA
export const getCameraSourceOptions = () => {
  return {
    photos: CameraSource.Photos,
    camera: CameraSource.Camera,
    prompt: CameraSource.Prompt
  };
};