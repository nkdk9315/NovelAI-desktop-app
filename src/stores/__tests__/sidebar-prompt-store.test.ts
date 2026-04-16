import { describe, it, expect, beforeEach } from "vitest";
import { useSidebarPromptStore } from "../sidebar-prompt-store";
import type { PromptGroupDto } from "@/types";

const mockGroup: PromptGroupDto = {
  id: "pg-1",
  name: "Test Group",
  folderId: null,
  defaultGenreIds: ["genre-1"],
  isSystem: false,
  usageType: "both",
  tags: [
    { id: "t-1", name: "Smile", tag: "smile", sortOrder: 0, defaultStrength: 2, thumbnailPath: null },
    { id: "t-2", name: "Blush", tag: "blush", sortOrder: 1, defaultStrength: 0, thumbnailPath: "/thumb.png" },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  thumbnailPath: null,
  isDefault: false,
  category: null,
  defaultStrength: 0,
  randomMode: false,
  randomCount: 1,
  randomSource: "enabled",
  wildcardToken: null,
};

const mockGroup2: PromptGroupDto = {
  id: "pg-2",
  name: "Second Group",
  folderId: null,
  defaultGenreIds: ["genre-1"],
  isSystem: true,
  usageType: "both",
  tags: [
    { id: "t-3", name: "Long Hair", tag: "long_hair", sortOrder: 0, defaultStrength: -1, thumbnailPath: null },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  thumbnailPath: null,
  isDefault: false,
  category: 0,
  defaultStrength: 0,
  randomMode: false,
  randomCount: 1,
  randomSource: "enabled",
  wildcardToken: null,
};

beforeEach(() => {
  useSidebarPromptStore.setState({ targets: {} });
});

describe("initTarget / removeTarget", () => {
  it("initializes empty target", () => {
    useSidebarPromptStore.getState().initTarget("main");
    const target = useSidebarPromptStore.getState().targets["main"];
    expect(target).toBeDefined();
    expect(target.groups).toHaveLength(0);
    expect(target.freeText).toBe("");
  });

  it("initializes with default groups", () => {
    useSidebarPromptStore.getState().initTarget("char-1", [mockGroup]);
    const target = useSidebarPromptStore.getState().targets["char-1"];
    expect(target.groups).toHaveLength(1);
    expect(target.groups[0].groupId).toBe("pg-1");
    expect(target.groups[0].tags).toHaveLength(2);
    expect(target.groups[0].tags[0].strength).toBe(2); // from defaultStrength
    expect(target.groups[0].tags[0].enabled).toBe(true);
  });

  it("does not re-initialize existing target", () => {
    useSidebarPromptStore.getState().initTarget("main", [mockGroup]);
    useSidebarPromptStore.getState().initTarget("main", [mockGroup2]);
    expect(useSidebarPromptStore.getState().targets["main"].groups).toHaveLength(1);
    expect(useSidebarPromptStore.getState().targets["main"].groups[0].groupId).toBe("pg-1");
  });

  it("removes target", () => {
    useSidebarPromptStore.getState().initTarget("char-1");
    useSidebarPromptStore.getState().removeTarget("char-1");
    expect(useSidebarPromptStore.getState().targets["char-1"]).toBeUndefined();
  });
});

describe("addGroupToTarget / removeGroupFromTarget", () => {
  it("adds a group", () => {
    useSidebarPromptStore.getState().initTarget("main");
    useSidebarPromptStore.getState().addGroupToTarget("main", mockGroup);
    expect(useSidebarPromptStore.getState().targets["main"].groups).toHaveLength(1);
  });

  it("does not add duplicate group", () => {
    useSidebarPromptStore.getState().initTarget("main");
    useSidebarPromptStore.getState().addGroupToTarget("main", mockGroup);
    useSidebarPromptStore.getState().addGroupToTarget("main", mockGroup);
    expect(useSidebarPromptStore.getState().targets["main"].groups).toHaveLength(1);
  });

  it("removes a group", () => {
    useSidebarPromptStore.getState().initTarget("main", [mockGroup, mockGroup2]);
    useSidebarPromptStore.getState().removeGroupFromTarget("main", "pg-1");
    const groups = useSidebarPromptStore.getState().targets["main"].groups;
    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe("pg-2");
  });
});

describe("tag operations", () => {
  beforeEach(() => {
    useSidebarPromptStore.getState().initTarget("main", [mockGroup]);
  });

  it("toggles tag enabled", () => {
    useSidebarPromptStore.getState().toggleTag("main", "pg-1", "t-1");
    const tag = useSidebarPromptStore.getState().targets["main"].groups[0].tags[0];
    expect(tag.enabled).toBe(false);

    useSidebarPromptStore.getState().toggleTag("main", "pg-1", "t-1");
    const tag2 = useSidebarPromptStore.getState().targets["main"].groups[0].tags[0];
    expect(tag2.enabled).toBe(true);
  });

  it("sets tag strength", () => {
    useSidebarPromptStore.getState().setTagStrength("main", "pg-1", "t-1", 5);
    const tag = useSidebarPromptStore.getState().targets["main"].groups[0].tags[0];
    expect(tag.strength).toBe(5);
  });

  it("toggles all tags", () => {
    useSidebarPromptStore.getState().toggleAllTags("main", "pg-1", false);
    const tags = useSidebarPromptStore.getState().targets["main"].groups[0].tags;
    expect(tags.every((t) => !t.enabled)).toBe(true);

    useSidebarPromptStore.getState().toggleAllTags("main", "pg-1", true);
    const tags2 = useSidebarPromptStore.getState().targets["main"].groups[0].tags;
    expect(tags2.every((t) => t.enabled)).toBe(true);
  });
});

describe("group UI state", () => {
  it("toggles group expanded", () => {
    useSidebarPromptStore.getState().initTarget("main", [mockGroup]);
    expect(useSidebarPromptStore.getState().targets["main"].groups[0].expanded).toBe(false);

    useSidebarPromptStore.getState().toggleGroupExpanded("main", "pg-1");
    expect(useSidebarPromptStore.getState().targets["main"].groups[0].expanded).toBe(true);
  });
});

describe("system tags", () => {
  it("adds a system tag to a group", () => {
    useSidebarPromptStore.getState().initTarget("main", [mockGroup]);
    useSidebarPromptStore.getState().addSystemTag("main", "pg-1", { name: "new_tag", category: 0 });
    const tags = useSidebarPromptStore.getState().targets["main"].groups[0].tags;
    expect(tags).toHaveLength(3);
    expect(tags[2].tag).toBe("new_tag");
    expect(tags[2].enabled).toBe(true);
    expect(tags[2].strength).toBe(0);
  });

  it("does not add duplicate system tag", () => {
    useSidebarPromptStore.getState().initTarget("main", [mockGroup]);
    useSidebarPromptStore.getState().addSystemTag("main", "pg-1", { name: "smile", category: 0 });
    expect(useSidebarPromptStore.getState().targets["main"].groups[0].tags).toHaveLength(2);
  });

  it("removes a system tag", () => {
    useSidebarPromptStore.getState().initTarget("main", [mockGroup]);
    useSidebarPromptStore.getState().addSystemTag("main", "pg-1", { name: "new_tag", category: 0 });
    const tagId = useSidebarPromptStore.getState().targets["main"].groups[0].tags[2].tagId;
    useSidebarPromptStore.getState().removeSystemTag("main", "pg-1", tagId);
    expect(useSidebarPromptStore.getState().targets["main"].groups[0].tags).toHaveLength(2);
  });
});

describe("freeText", () => {
  it("sets free text for target", () => {
    useSidebarPromptStore.getState().initTarget("main");
    useSidebarPromptStore.getState().setFreeText("main", "1girl, solo");
    expect(useSidebarPromptStore.getState().targets["main"].freeText).toBe("1girl, solo");
  });

  it("no-ops for non-existent target", () => {
    useSidebarPromptStore.getState().setFreeText("nonexistent", "test");
    expect(useSidebarPromptStore.getState().targets["nonexistent"]).toBeUndefined();
  });
});
