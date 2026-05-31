// validation.js
// Simple validation utilities for user registration

/** Validate email using basic regex */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/** Validate phone number: digits only, optional leading +, length 10-15 */
const isValidPhone = (phone) => {
  const re = /^\+?[0-9]{10,15}$/;
  return re.test(phone);
};

/** Validate name: letters, spaces, hyphens, length 2-50 */
const isValidName = (name) => {
  const re = /^[A-Za-z\s-]{2,50}$/;
  return re.test(name);
};

module.exports = { isValidEmail, isValidPhone, isValidName };
