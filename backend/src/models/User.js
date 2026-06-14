import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    role: {
      type: String,
      enum: {
        values: ['Admin', 'Operator', 'SafetyOfficer', 'Manager'],
        message: 'Role must be Admin, Operator, SafetyOfficer, or Manager'
      },
      required: [true, 'Role is required']
    },
    permissions: {
      type: [String],
      default: []
    },
    department: {
      type: String,
      trim: true,
      default: 'General Operations'
    },
    isActive: {
      type: Boolean,
      default: false
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^\+?[1-9]\d{1,14}$/.test(v) || /^\d{10}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      }
    },
    lastLogin: {
      type: Date,
      default: null
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordExpire: {
      type: Date,
      default: null
    },
    loginOTP: {
      type: String,
      default: null
    },
    loginOTPExpire: {
      type: Date,
      default: null
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    otpLockedUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: Hash user password before database insert/update
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method: Compare input password against database hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
