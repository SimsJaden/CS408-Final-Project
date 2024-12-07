import { parseMaterials, createRecipe, fetchRecipes, fetchAllRecipes, deleteRecipe } from "../js/main.js";

QUnit.module("parseMaterials", function () {
  QUnit.test("Parses valid material input", function (assert) {
    const input = "iron plates: 5, copper: 10";
    const result = parseMaterials(input);
    assert.deepEqual(result, { iron_plates: 5, copper: 10 }, "Parses materials correctly.");
  });

  QUnit.test("Handles empty input gracefully", function (assert) {
    const input = "";
    const result = parseMaterials(input);
    assert.deepEqual(result, {}, "Empty input returns an empty object.");
  });
});

QUnit.module("fetchRecipes", function () {
  QUnit.test("Fetches base recipes", async function (assert) {
    const done = assert.async();
    try {
      await fetchRecipes("base");
      assert.ok(true, "Base recipes fetched successfully.");
    } catch (error) {
      assert.ok(false, "Error fetching base recipes.");
    } finally {
      done();
    }
  });
});

QUnit.module("createRecipe", function () {
  QUnit.test("Fails when no input is provided", async function (assert) {
    const done = assert.async();
    document.body.innerHTML = `
      <input id="recipe-name" value="">
      <textarea id="recipe-materials"></textarea>
    `;

    try {
      await createRecipe();
      assert.ok(false, "createRecipe should fail with empty input.");
    } catch {
      assert.ok(true, "createRecipe failed as expected with empty input.");
    } finally {
      done();
    }
  });
});

QUnit.module("deleteRecipe", function () {
  QUnit.test("Handles failed deletion", async function (assert) {
    const done = assert.async();
    try {
      await deleteRecipe("nonexistent-id");
      assert.ok(false, "deleteRecipe should fail with nonexistent ID.");
    } catch {
      assert.ok(true, "deleteRecipe failed as expected with nonexistent ID.");
    } finally {
      done();
    }
  });
});
