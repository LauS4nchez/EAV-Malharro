import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const openMediaPicker = async (options = {}) => {
  const {
    allowEditing = false,
    quality = 90,
    source = CameraSource.Photos, // Photos, Camera, Prompt
    resultType = CameraResultType.DataUrl
  } = options;

  if (!isNativePlatform()) {
    // Para web, usar input file tradicional
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

  try {
    // Para app nativa con Capacitor
    const image = await Camera.getPhoto({
      quality,
      allowEditing,
      resultType,
      source,
      correctOrientation: true,
      presentationStyle: 'popover'
    });

    if (!image) {
      return null;
    }

    // Convertir la imagen a File object para mantener compatibilidad
    let file;
    
    if (resultType === CameraResultType.Uri) {
      // Si es URI, necesitamos convertir a blob
      const response = await fetch(image.webPath);
      const blob = await response.blob();
      file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type });
    } else if (resultType === CameraResultType.DataUrl) {
      // Si es DataUrl, convertir a blob
      const response = await fetch(image.dataUrl);
      const blob = await response.blob();
      file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type });
    }

    return {
      file,
      dataUrl: image.dataUrl,
      webPath: image.webPath,
      format: image.format
    };

  } catch (error) {
    if (error.message === 'User cancelled photos app') {
      console.log('Usuario canceló la selección');
      return null;
    }
    console.error('Error en media picker:', error);
    throw error;
  }
};

export const getCameraSourceOptions = () => {
  return {
    photos: CameraSource.Photos,
    camera: CameraSource.Camera,
    prompt: CameraSource.Prompt
  };
};