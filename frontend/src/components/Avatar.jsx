import React, { useState, useEffect, forwardRef } from 'react';
import { Avatar as AntAvatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { formatUploadUrl } from '../utils/urlHelper';

const Avatar = forwardRef(({ src, size = 'default', className, ...props }, ref) => {
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  // تحديث مصدر الصورة عند تغييرها
  useEffect(() => {
    // إعادة تعيين حالة الخطأ عند تغيير مصدر الصورة
    setError(false);
    
    if (!src) {
      setImageSrc(null);
      return;
    }
    
    // معالجة مسار الصورة وإضافة طابع زمني لمنع التخزين المؤقت
    if (src.startsWith('data:') || src.startsWith('http')) {
      setImageSrc(src);
    } else {
      // Format URL to handle uploads properly in production
      const formattedSrc = formatUploadUrl(src);
      const timeStamp = new Date().getTime();
      setImageSrc(`${formattedSrc}?t=${timeStamp}`);
    }
  }, [src]);

  const handleError = () => {
    setError(true);
  };

  return (
    <AntAvatar
      ref={ref}
      size={size}
      icon={error || !imageSrc ? <UserOutlined /> : null}
      src={error ? null : imageSrc}
      onError={handleError}
      className={className}
      {...props}
    />
  );
});

export default Avatar;