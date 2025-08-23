import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from "globals";
import React from 'react';


export default [
	js.configs.recommended,
	{
		files: ['**/*.{js,jsx,ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
				React: true,
				window: 'readonly',
				document: 'readonly',
				console: 'readonly',
				process: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			'react-hooks': reactHooks,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			'react-hooks/react-compiler': 'warn', 
		},
	},
	{
		ignores: ['dist/', 'node_modules/', 'wailsjs/'],
	},
];