import { Resolver } from "../src/resolver";
import { Follower } from "../src/follower";
import { Sender } from "../src/sender";
import { Auth } from "../src/auth";

describe("Follower", () => {
  const auth = new Auth({
    clientId: "0",
    clientSecret: "1",
    refreshToken: "42",
    endpoint: "https://api.foxy.local",
    silent: true,
  });

  it("extends Resolver", () => expect(new Follower(auth)).toBeInstanceOf(Resolver));

  it("extends Sender", () => expect(new Follower(auth)).toBeInstanceOf(Sender));

  it("returns an instance of Follower with the extended path on .follow()", async () => {
    const follower = new Follower(auth, [], "https://api.foxy.local");
    const nextFollower = follower.follow("fx:reporting");

    expect(nextFollower).toBeInstanceOf(Follower);
    await expect(nextFollower.resolve()).resolves.toBe("https://api.foxycart.com/reporting");
  });
});
