module.exports = {
root: true,
extends: ['next', 'airbnb', 'airbnb/hooks', 'plugin:prettier/recommended'],
plugins: ['prettier'],
rules: {
'react/react-in-jsx-scope': 'off',
'react/jsx-props-no-spreading': 'off',
'react/jsx-filename-extension': [1, { extensions: ['.tsx'] }],
'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
'prettier/prettier': 'error'
}
};