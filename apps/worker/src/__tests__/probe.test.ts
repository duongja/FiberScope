import { describe, expect, it } from "vitest";
import { parseMultiaddrTcp } from "../probe.js";

describe("parseMultiaddrTcp", () => {
  it("parses ip4 tcp multiaddrs", () => {
    expect(parseMultiaddrTcp("/ip4/127.0.0.1/tcp/8228")).toEqual({
      host: "127.0.0.1",
      port: 8228,
    });
  });

  it("parses dns tcp multiaddrs with websocket suffixes", () => {
    expect(parseMultiaddrTcp("/dns4/node.example.com/tcp/443/wss")).toEqual({
      host: "node.example.com",
      port: 443,
    });
  });

  it("ignores unsupported or invalid addresses", () => {
    expect(parseMultiaddrTcp("/dns4/node.example.com/udp/8228")).toBeNull();
    expect(parseMultiaddrTcp("/dns4/node.example.com/tcp/99999")).toBeNull();
  });
});
