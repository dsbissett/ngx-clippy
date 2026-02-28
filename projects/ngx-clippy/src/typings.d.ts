/**
 * Type declaration for AVIF image imports.
 * Allows dynamic import() of .avif files to resolve as a string URL.
 */
declare module '*.avif' {
  const value: string;
  export default value;
}
