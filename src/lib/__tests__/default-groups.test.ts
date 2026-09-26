import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptGroupDto } from "@/types";

vi.mock("@/lib/ipc", () => ({
  listDefaultSystemGroupsForGenre: vi.fn(),
  listPromptGroups: vi.fn(),
  hydratePromptGroupById: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { loadDefaultGroupsForGenre } from "../default-groups";

const dto = (id: string, over: Partial<PromptGroupDto> = {}) =>
  ({ id, name: id, isSystem: false, isDefault: false, tags: [], defaultGenreIds: [], ...over }) as PromptGroupDto;

describe("loadDefaultGroupsForGenre", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the genre table, respects isDefault for user groups, hydrates system groups", async () => {
    vi.mocked(ipc.listDefaultSystemGroupsForGenre).mockResolvedValue(["user-on", "user-off", "system-group-cat-1", "tagdb-9"]);
    vi.mocked(ipc.listPromptGroups).mockResolvedValue([
      dto("user-on", { isDefault: true }),
      dto("user-off"),
    ]);
    vi.mocked(ipc.hydratePromptGroupById).mockImplementation(async (id: string) => {
      if (id === "tagdb-9") throw new Error("gone");
      return dto(id, { isSystem: true });
    });

    const out = await loadDefaultGroupsForGenre("genre-female");

    expect(ipc.listDefaultSystemGroupsForGenre).toHaveBeenCalledWith("genre-female");
    expect(out.map((g) => g.id)).toEqual(["user-on", "system-group-cat-1"]);
  });
});
