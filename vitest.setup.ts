import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// `server-only` lança erro se importado fora de RSC. No Vitest, tratamos como no-op.
vi.mock("server-only", () => ({}));
