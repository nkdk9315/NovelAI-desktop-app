import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePromptStore } from "../prompt-store";
import type { GenreDto, PromptGroupDto } from "@/types";

vi.mock("@/lib/ipc", () => ({
  listGenres: vi.fn(),
  createGenre: vi.fn(),
  deleteGenre: vi.fn(),
  listPromptGroups: vi.fn(),
  createPromptGroup: vi.fn(),
  updatePromptGroup: vi.fn(),
  deletePromptGroup: vi.fn(),
}));

import * as ipc from "@/lib/ipc";

const mockGenre: GenreDto = {
  id: "genre-1",
  name: "Test Genre",
  isSystem: false,
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00Z",
};

const mockGroup: PromptGroupDto = {
  id: "pg-1",
  name: "Test Group",
  genreId: "genre-1",
  isDefaultForGenre: false,
  isSystem: false,
  usageType: "both",
  tags: [{ id: "t-1", tag: "tag1", sortOrder: 0 }],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  usePromptStore.setState({ genres: [], promptGroups: [], isLoading: false });
  vi.clearAllMocks();
});

describe("genre actions", () => {
  it("loadGenres fetches and sets genres", async () => {
    vi.mocked(ipc.listGenres).mockResolvedValue([mockGenre]);

    await usePromptStore.getState().loadGenres();
    expect(usePromptStore.getState().genres).toEqual([mockGenre]);
    expect(ipc.listGenres).toHaveBeenCalledOnce();
  });

  it("createGenre adds to state and returns result", async () => {
    vi.mocked(ipc.createGenre).mockResolvedValue(mockGenre);

    const result = await usePromptStore.getState().createGenre({ name: "Test Genre" });
    expect(result).toEqual(mockGenre);
    expect(usePromptStore.getState().genres).toHaveLength(1);
    expect(usePromptStore.getState().genres[0].id).toBe("genre-1");
  });

  it("deleteGenre removes from state", async () => {
    usePromptStore.setState({ genres: [mockGenre] });
    vi.mocked(ipc.deleteGenre).mockResolvedValue(undefined);

    await usePromptStore.getState().deleteGenre("genre-1");
    expect(usePromptStore.getState().genres).toHaveLength(0);
    expect(ipc.deleteGenre).toHaveBeenCalledWith("genre-1");
  });
});

describe("promptGroup actions", () => {
  it("loadPromptGroups fetches with filters", async () => {
    vi.mocked(ipc.listPromptGroups).mockResolvedValue([mockGroup]);

    await usePromptStore.getState().loadPromptGroups("genre-1", "both", "test");
    expect(usePromptStore.getState().promptGroups).toEqual([mockGroup]);
    expect(usePromptStore.getState().isLoading).toBe(false);
    expect(ipc.listPromptGroups).toHaveBeenCalledWith("genre-1", "both", "test");
  });

  it("createPromptGroup adds to state", async () => {
    vi.mocked(ipc.createPromptGroup).mockResolvedValue(mockGroup);

    const result = await usePromptStore.getState().createPromptGroup({
      name: "Test Group",
      genreId: "genre-1",
      usageType: "both",
      tags: ["tag1"],
    });
    expect(result).toEqual(mockGroup);
    expect(usePromptStore.getState().promptGroups).toHaveLength(1);
  });

  it("updatePromptGroup calls IPC", async () => {
    vi.mocked(ipc.updatePromptGroup).mockResolvedValue(undefined);

    await usePromptStore.getState().updatePromptGroup({
      id: "pg-1",
      name: "Updated",
    });
    expect(ipc.updatePromptGroup).toHaveBeenCalledWith({
      id: "pg-1",
      name: "Updated",
    });
  });

  it("deletePromptGroup removes from state", async () => {
    usePromptStore.setState({ promptGroups: [mockGroup] });
    vi.mocked(ipc.deletePromptGroup).mockResolvedValue(undefined);

    await usePromptStore.getState().deletePromptGroup("pg-1");
    expect(usePromptStore.getState().promptGroups).toHaveLength(0);
    expect(ipc.deletePromptGroup).toHaveBeenCalledWith("pg-1");
  });
});
