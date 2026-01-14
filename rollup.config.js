import terser from '@rollup/plugin-terser';

export default {
  input: 'src/simpl.js',
  output: [
    {
      file: 'dist/simpl.js',
      format: 'esm',
    },
    {
      file: 'dist/simpl.min.js',
      format: 'esm',
      plugins: [terser()]
    }
  ],
};

