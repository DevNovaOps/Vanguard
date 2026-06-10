import jwt from 'jsonwebtoken';

/**
 * Generates a JSON Web Token for authenticated users.
 * Payload holds the database User ID, Role, and Email.
 * Expires in 7 days.
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );
};

export default generateToken;
