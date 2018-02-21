/**
 * Get the name of the value type
 * @param {*} value - Any value
 * @private
 * @returns {string} - Value type name
 */
module.expors = function getTypeName(rawValue) {
  const value =
    typeof rawValue === 'function' ? rawValue : rawValue.constructor;

  return value.name;
};
