export const validateEmail = (email: string): string | undefined => {
  if (!email) return 'Email is required';
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
    return 'Invalid email address';
  }
};

export const validatePassword = (password: string): string | undefined => {
  if (!password) return 'Password is required';
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
};