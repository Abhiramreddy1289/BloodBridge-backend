const crypto = require('crypto');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DATA_URI_PATTERN = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/;

const getCloudinaryConfig = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured');
  }

  return { cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, apiSecret: CLOUDINARY_API_SECRET };
};

const signParams = (params, apiSecret) => {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
};

const assertImageDataUri = (dataUri) => {
  if (typeof dataUri !== 'string') {
    throw new Error('Image must be a data URL');
  }

  const match = dataUri.match(DATA_URI_PATTERN);

  if (!match) {
    throw new Error('Only PNG, JPG, JPEG, and WEBP images are supported');
  }

  const size = Buffer.byteLength(match[2], 'base64');

  if (size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5MB or smaller');
  }
};

const uploadImage = async (dataUri, folder = 'bloodbridge') => {
  assertImageDataUri(dataUri);

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    folder,
    timestamp,
  };
  const signature = signParams(params, apiSecret);
  const form = new FormData();

  form.append('file', dataUri);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Cloudinary upload failed');
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

module.exports = { uploadImage };
