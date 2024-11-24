import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	testDir: './src',
	testMatch: /.*\.playwright\.ts$/,
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' },
		},
		// Uncomment these if you want to test in other browsers
		// {
		//     name: 'firefox',
		//     use: { browserName: 'firefox' },
		// },
		// {
		//     name: 'webkit',
		//     use: { browserName: 'webkit' },
		// },
	],
	timeout: 30000,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'dot' : 'list',
};

export default config;
