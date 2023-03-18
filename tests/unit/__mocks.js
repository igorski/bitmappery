import { vi } from "vitest";

// zCanvas mocks

export function sprite() {
    this.setDraggable = vi.fn();
    this.setInteractive = vi.fn();
    this.dispose = vi.fn();
}

export function mockZCanvas() {
    vi.mock( "zcanvas", () => ({
        loader: vi.fn(),
        canvas: vi.fn(),
        sprite,
    }));
}
