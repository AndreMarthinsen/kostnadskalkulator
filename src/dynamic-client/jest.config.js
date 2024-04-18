module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/*.test.tsx'],
    transformIgnorePatterns: [
        "/node_modules/(?!(d3)/)"
    ]
};