const { test, expect } = require("@playwright/test");
const { CustomAttribute, registerAttribute } = require("../main");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Registering a custom attribute", () => {
  test("should call connectedCallback when registering attributes", async ({
    page,
  }) => {
    const called = await page.evaluate(() => {
      let connectedCallbackCalled = false;
      class TestingAttribute extends CustomAttribute {
        connectedCallback() {
          connectedCallbackCalled = true;
        }
      }
      registerAttribute("testing-attribute", TestingAttribute);

      return connectedCallbackCalled;
    });
    expect(called).toBe(true);
  });

  test("should call changedCallback when attribute value updates", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.changed = false;
      class TestingAttribute extends CustomAttribute {
        changedCallback() {
          window.changed = true;
        }
      }
      registerAttribute("testing-attribute", TestingAttribute);
    });

    await page
      .getByTestId("el")
      .evaluate((el) => el.setAttribute("testing-attribute", "changed"));

    const changed = await page.evaluate(() => window.changed);
    expect(changed).toBe(true);
  });

  test("should call disconnectedCallback when attribute is disconnected from DOM", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.disconnected = false;
      class TestingAttribute extends CustomAttribute {
        disconnectedCallback() {
          window.disconnected = true;
        }
      }
      registerAttribute("testing-attribute", TestingAttribute);
    });

    await page
      .getByTestId("el")
      .evaluate((el) => el.removeAttribute("testing-attribute"));
    const disconnected = await page.evaluate(() => window.disconnected);
    expect(disconnected).toBe(true);
  });

  test("should call disconnectedCallback when element is removed from DOM", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.disconnected = false;
      class TestingAttribute extends CustomAttribute {
        disconnectedCallback() {
          window.disconnected = true;
        }
      }
      registerAttribute("testing-attribute", TestingAttribute);
    });

    await page.getByTestId("el").evaluate((el) => el.remove());
    const disconnected = await page.evaluate(() => window.disconnected);
    expect(disconnected).toBe(true);
  });

  test("should call connectedCallback when new element with attribute is added to the DOM", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.connected = false;
      class TestingAttribute extends CustomAttribute {
        connectedCallback() {
          if (this.host.id === "newly-added") {
            window.connected = true;
          }
        }
      }
      registerAttribute("testing-attribute", TestingAttribute);
    });

    await page.evaluate(() => {
      const el = document.createElement("div");
      el.setAttribute("testing-attribute", "added");
      el.setAttribute("id", "newly-added");
      document.body.append(el);
    });
    const connected = await page.evaluate(() => window.connected);
    expect(connected).toBe(true);
  });

  test("should not call disconnected nor connected callback when moving elements", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.connected = 0;
      window.disconnected = 0;

      class TestingAttribute extends CustomAttribute {
        connectedCallback() {
          window.connected += 1;
        }
        disconnectedCallback() {
          window.disconnected += 1;
        }
      }
      registerAttribute("testing-attribute", TestingAttribute);
    });
    const beforeMove = await page.evaluate(() => ({
      c: window.connected,
      d: window.disconnected,
    }));
    expect(beforeMove).toMatchObject({ c: 1, d: 0 });

    const el = page.getByTestId("el");
    await el.evaluate((el) =>
      el.before(document.querySelector('[data-testid="paragraph"]'))
    );
    const afterMove = await page.evaluate(() => ({
      c: window.connected,
      d: window.disconnected,
    }));
    expect(afterMove).toMatchObject({ c: 1, d: 0 });
  });

  test("should call disconnected and connected callback when removing and re-adding elements", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.connected = 0;
      window.disconnected = 0;
      window.changed = 0;

      class TestingAttribute extends CustomAttribute {
        connectedCallback() {
          window.connected += 1;
        }
        disconnectedCallback() {
          window.disconnected += 1;
        }
        changedCallback() {
          window.changed += 1;
        }
      }
      registerAttribute("testing-attribute", TestingAttribute);
    });
    const beforeMove = await page.evaluate(() => ({
      c: window.connected,
      d: window.disconnected,
      ch: window.changed,
    }));

    const el = page.getByTestId("el");
    await el.evaluate((el) => {
      el.remove();
      return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          document.body.append(el);
          el.setAttribute("testing-attribute", "changed");
          resolve();
        });
      });
    });
    const afterMove = await page.evaluate(() => ({
      c: window.connected,
      d: window.disconnected,
      ch: window.changed,
    }));
    console.log(beforeMove, afterMove);
    expect(beforeMove).toEqual({ c: 1, d: 0, ch: 0 });
    expect(afterMove).toEqual({ c: 2, d: 1, ch: 0 });
  });
});
