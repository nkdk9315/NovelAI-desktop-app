import { describe, expect, it } from "vitest";
import { insertTagAt, tagQueryAt } from "@/lib/tag-query";

const at = (text: string) => tagQueryAt(text, text.length);

describe("tagQueryAt", () => {
  it("takes the item after a comma", () => {
    expect(at("1girl, smi")).toMatchObject({ query: "smi", artist: false, start: 7 });
  });
  it("takes the name inside a weight", () => {
    expect(at("2::smi")).toMatchObject({ query: "smi", start: 3 });
    expect(at("-1.5::blu")).toMatchObject({ query: "blu" });
    expect(at("1girl, 2::smile, blu")).toMatchObject({ query: "blu" });
  });
  it("starts a new item after a closed weight, even without a comma", () => {
    expect(at("2::smile:: blu")).toMatchObject({ query: "blu", start: 11 });
    expect(at("2::smile::blu")).toMatchObject({ query: "blu" });
    expect(at("{smile} blu")).toMatchObject({ query: "blu" });
    expect(at("smile\nblu")).toMatchObject({ query: "blu" });
  });
  it("asks for artists after artist: / artist# and inside an artist# group", () => {
    expect(at("artist:wlo")).toMatchObject({ query: "wlo", artist: true, start: 7 });
    expect(at("0.8::artist#a-10")).toMatchObject({ query: "a-10", artist: true });
    expect(at("0.8::artist#a-10, ask")).toMatchObject({ query: "ask", artist: true });
    expect(at("0.8::artist#a-10, ask::, smi")).toMatchObject({ query: "smi", artist: false });
    expect(at("artist:a-10, smi")).toMatchObject({ query: "smi", artist: false });
  });
  it("does not search weights being typed, short queries or Text:", () => {
    expect(at("1.5")).toBeNull();
    expect(at("a, s")).toBeNull();
    expect(at("Text: こんにちは")).toBeNull();
  });
  it("covers the rest of the name after the cursor", () => {
    const text = "2::smi::, blush";
    expect(tagQueryAt(text, 5)).toMatchObject({ query: "sm", start: 3, end: 6 });
  });
});

describe("insertTagAt", () => {
  const ins = (text: string, tag: string, pos = text.length) => insertTagAt(text, tagQueryAt(text, pos)!, tag);
  it("keeps the weight around the tag", () => {
    expect(ins("2::smi", "smile").text).toBe("2::smile");
    expect(ins("2::smi::, blush", "smile", 6)).toEqual({ text: "2::smile::, blush", cursor: 8 });
  });
  it("keeps the artist prefix", () => {
    expect(ins("1girl, artist:wlo", "wlop").text).toBe("1girl, artist:wlop");
  });
  it("adds a comma only when a tag follows directly", () => {
    expect(ins("smi blush", "smile", 3).text).toBe("smile, blush");
    expect(ins("a, smi, b", "smile", 6).text).toBe("a, smile, b");
    expect(ins("a,smi", "smile").text).toBe("a, smile");
  });
});
