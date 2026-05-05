import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';

export default function PhotoUploadWebcam({ value, onChange }) {
  const webcamRef = useRef(null);
  const [preview, setPreview] = useState(value || '');
  const [showWebcam, setShowWebcam] = useState(false);

  React.useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(url, file);
  };

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setPreview(imageSrc);

    // Converter base64 para File
    fetch(imageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], 'webcam-photo.jpg', { type: 'image/jpeg' });
        onChange(imageSrc, file);
      });

    setShowWebcam(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button type="button" onClick={() => setShowWebcam((v) => !v)}>
        {showWebcam ? 'Fechar webcam' : 'Tirar foto da webcam'}
      </button>
      {showWebcam && (
        <div style={{ margin: '8px 0' }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={200}
            height={150}
            style={{ borderRadius: 8 }}
          />
          <button type="button" onClick={capture} style={{ marginTop: 4 }}>
            Capturar foto
          </button>
        </div>
      )}
      {preview && (
        <img
          src={preview}
          alt="Prévia da foto"
          style={{ maxWidth: 100, borderRadius: 8, marginTop: 8 }}
        />
      )}
    </div>
  );
}
