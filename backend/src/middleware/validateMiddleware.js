const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: true, // Allow fields not in the schema by default, or change to false if strict
      stripUnknown: false
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Reassign validated (and potentially cast) values back to the request
    req[property] = value;
    next();
  };
};

export default validateRequest;
