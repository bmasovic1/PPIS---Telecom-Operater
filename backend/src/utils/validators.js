const requireFields = (payload, fields) => {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
  return missing;
};

const isPositiveInt = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const ensureArrayOfPositiveInts = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return false;
  }

  return values.every((value) => isPositiveInt(value));
};

module.exports = {
  requireFields,
  isPositiveInt,
  ensureArrayOfPositiveInts,
};