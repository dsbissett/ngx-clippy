/**
 * Type declaration for PNG image imports.
 * Allows dynamic import() of .png files to resolve as a string URL.
 */
declare module '*.png' {
  const value: string;
  export default value;
}
