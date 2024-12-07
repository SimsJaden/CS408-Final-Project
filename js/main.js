const API_BASE_URL = "https://ccwgjp955c.execute-api.us-east-2.amazonaws.com";

export const materialFriendlyNames = {
  iron_plate: "Iron Plates",
  gear: "Gears",
  electronic_circuit: "Electronic Circuits",
  copper: "Copper",
  steel: "Steel",
};

window.onload = loaded;

function loaded() {
  setupButtons();
}

function setupButtons() {
  document.getElementById("show-base").addEventListener("click", () => fetchRecipes("base"));
  document.getElementById("show-custom").addEventListener("click", () => fetchRecipes("custom"));
  document.getElementById("show-all").addEventListener("click", fetchAllRecipes);
  document.getElementById("create-recipe").addEventListener("click", createRecipe);
}

export async function deleteRecipe(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Error deleting recipe");

    alert(`Recipe with ID "${id}" deleted successfully.`);
    fetchRecipes("custom"); // Refresh the custom recipes list
  } catch (error) {
    console.error(`Error deleting recipe (${id}):`, error);
    alert("Failed to delete the recipe. Please check your backend.");
  }
}

export async function fetchRecipes(type) {
  try {
    const response = await fetch(`${API_BASE_URL}/items?type=${type}`);
    if (!response.ok) throw new Error(`Error fetching ${type} recipes`);

    const recipes = await response.json();
    if (!Array.isArray(recipes)) throw new Error(`Unexpected response format for ${type} recipes`);

    await displayRecipes(recipes, type);
  } catch (error) {
    console.error(`Error fetching recipes (${type}):`, error);
    alert(`Failed to fetch ${type} recipes. Please check your backend.`);
  }
}

export async function fetchAllRecipes() {
  try {
    const baseRecipes = await fetch(`${API_BASE_URL}/items?type=base`).then((res) => res.json());
    const customRecipes = await fetch(`${API_BASE_URL}/items?type=custom`).then((res) => res.json());

    const allRecipes = [
      ...(Array.isArray(baseRecipes) ? baseRecipes : []),
      ...(Array.isArray(customRecipes) ? customRecipes : []),
    ];

    await displayRecipes(allRecipes, "all");
  } catch (error) {
    console.error("Error fetching all recipes:", error);
    alert("Failed to fetch all recipes. Please check your backend.");
  }
}

export async function displayRecipes(recipes, type) {
  const container = document.getElementById("recipe-container");
  container.innerHTML = `<h2>${type === "base" ? "Base Recipes" : type === "custom" ? "Custom Recipes" : "All Recipes"}</h2>`;

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
        <tr>
            ${type === "custom" ? "<th>Delete</th>" : ""}
            <th>Item</th>
            <th>Items Required</th>
            <th>Quantity</th>
            <th>Raw Material Breakdown</th>
            <th>Missing Recipes</th>
        </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  for (const recipe of recipes) {
    const row = document.createElement("tr");

    if (type === "custom") {
      const deleteCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "X";
      deleteButton.style.color = "red";
      deleteButton.style.cursor = "pointer";
      deleteButton.addEventListener("click", () => {
        if (confirm(`Are you sure you want to delete the recipe "${recipe.name}"?`)) {
          deleteRecipe(recipe.id);
        }
      });
      deleteCell.appendChild(deleteButton);
      row.appendChild(deleteCell);
    }

    const nameCell = document.createElement("td");
    nameCell.textContent = recipe.name || "Unnamed Recipe";
    row.appendChild(nameCell);

    const materialsCell = document.createElement("td");
    const friendlyMaterials = Object.entries(recipe.materials || {})
      .map(([key, value]) => `${materialFriendlyNames[key] || key.replace(/_/g, " ")}: ${value}`)
      .join(", ");
    materialsCell.textContent = friendlyMaterials || "No materials specified";
    row.appendChild(materialsCell);

    const quantityCell = document.createElement("td");
    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.min = 1;
    quantityInput.value = 1;
    quantityInput.style.width = "50px";
    quantityCell.appendChild(quantityInput);
    row.appendChild(quantityCell);

    const rawMaterialsCell = document.createElement("td");
    rawMaterialsCell.textContent = "Calculating...";
    row.appendChild(rawMaterialsCell);

    const missingRecipesCell = document.createElement("td");
    missingRecipesCell.textContent = "None";
    row.appendChild(missingRecipesCell);

    await updateRawMaterialBreakdown(recipe.id, 1, rawMaterialsCell, missingRecipesCell);

    tbody.appendChild(row);

    quantityInput.addEventListener("change", async () => {
      const quantity = parseInt(quantityInput.value, 10) || 1;
      await updateRawMaterialBreakdown(recipe.id, quantity, rawMaterialsCell, missingRecipesCell);
    });
  }

  container.appendChild(table);
}

async function updateRawMaterialBreakdown(id, quantity, rawMaterialsCell, missingRecipesCell) {
  try {
    const rawData = await calculateRawMaterials(id, quantity);

    const friendlyRawMaterials = Object.entries(rawData.rawMaterials || {})
      .map(([key, value]) => `${materialFriendlyNames[key] || key.replace(/_/g, " ")}: ${value}`)
      .join(", ");
    rawMaterialsCell.textContent = friendlyRawMaterials || "None";

    const missingRecipes = rawData.missingRecipes || [];
    missingRecipesCell.textContent = missingRecipes.length
      ? missingRecipes.map((id) => materialFriendlyNames[id] || id.replace(/_/g, " ")).join(", ")
      : "None";
  } catch (error) {
    console.error("Error calculating raw materials:", error);
    rawMaterialsCell.textContent = "Error";
    missingRecipesCell.textContent = "Error";
  }
}

async function calculateRawMaterials(id, quantity = 1) {
  try {
    const response = await fetch(`${API_BASE_URL}/calculate/${id}?quantity=${quantity}`);
    if (!response.ok) throw new Error("Error calculating raw materials");
    return await response.json();
  } catch (error) {
    console.error("Error fetching raw material breakdown:", error);
    return { rawMaterials: {}, missingRecipes: [] };
  }
}

export async function createRecipe() {
  const name = document.getElementById("recipe-name").value.trim();
  const materialsInput = document.getElementById("recipe-materials").value.trim();

  if (!name || !materialsInput) {
    alert("Please provide both a name and materials.");
    return;
  }

  const materials = parseMaterials(materialsInput);
  const id = name.toLowerCase().replace(/\s+/g, "_");

  try {
    const response = await fetch(`${API_BASE_URL}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, materials }),
    });

    if (!response.ok) throw new Error("Error creating recipe");
    alert("Recipe created successfully!");
    fetchRecipes("custom");
  } catch (error) {
    console.error("Error creating recipe:", error);
    alert("Error creating recipe.");
  }
}

export function parseMaterials(input) {
  const regex = /(\d+)\s*([a-zA-Z\s]+)|([a-zA-Z\s]+):\s*(\d+)/g;
  const result = {};

  let match;
  while ((match = regex.exec(input)) !== null) {
    const quantity = parseInt(match[1] || match[4], 10);
    const materialName = (match[2] || match[3] || "").trim().toLowerCase().replace(/\s+/g, "_");
    result[materialName] = quantity;
  }

  return result;
}
