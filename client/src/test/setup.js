import '@testing-library/jest-dom';

// The components call the Python service through axios; every test mocks
// ../components/Profiling/adviceApi, so no real network calls happen here.
