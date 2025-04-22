// API Configuration
const MEAL_API_URL = 'https://www.themealdb.com/api/json/v1/1/';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const randomBtn = document.getElementById('random-btn');
const categoryFilter = document.getElementById('category-filter');
const areaFilter = document.getElementById('area-filter');
const mealContainer = document.getElementById('meal-container');

// Initialize the app
async function initApp() {
    try {
        // Load filters and random meals
        await Promise.all([loadCategories(), loadAreas()]);
        await loadRandomMeals();
        
        // Set up event listeners
        searchBtn.addEventListener('click', handleSearch);
        randomBtn.addEventListener('click', loadRandomMeals);
        categoryFilter.addEventListener('change', handleFilterChange);
        areaFilter.addEventListener('change', handleFilterChange);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Gagal memuat aplikasi. Silakan refresh halaman.');
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch(`${MEAL_API_URL}list.php?c=list`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const data = await response.json();
        if (!data.meals) throw new Error('No categories found');
        
        categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
        data.meals.forEach(category => {
            const option = document.createElement('option');
            option.value = category.strCategory;
            option.textContent = category.strCategory;
            categoryFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
        loadFallbackCategories();
    }
}

// Load areas
async function loadAreas() {
    try {
        const response = await fetch(`${MEAL_API_URL}list.php?a=list`);
        if (!response.ok) throw new Error('Failed to fetch areas');
        
        const data = await response.json();
        if (!data.meals) throw new Error('No areas found');
        
        areaFilter.innerHTML = '<option value="">Semua Negara</option>';
        data.meals.forEach(area => {
            const option = document.createElement('option');
            option.value = area.strArea;
            option.textContent = area.strArea;
            areaFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading areas:', error);
        loadFallbackAreas();
    }
}

// Fallback categories
function loadFallbackCategories() {
    const fallback = ['Beef', 'Chicken', 'Dessert', 'Lamb', 'Pasta', 'Pork', 'Seafood', 'Vegetarian'];
    categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
    fallback.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });
}

// Fallback areas
function loadFallbackAreas() {
    const fallback = ['American', 'British', 'Chinese', 'French', 'Indian', 'Italian', 'Japanese', 'Mexican', 'Spanish'];
    areaFilter.innerHTML = '<option value="">Semua Negara</option>';
    fallback.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
}

// Load random meals
async function loadRandomMeals() {
    try {
        showLoading('Memuat resep acak...');
        
        // Fetch 8 random meals
        const requests = Array(8).fill().map(() => fetch(`${MEAL_API_URL}random.php`));
        const responses = await Promise.all(requests);
        const mealsData = await Promise.all(responses.map(res => res.json()));
        
        const meals = mealsData.map(data => data.meals?.[0]).filter(Boolean);
        displayMeals(meals);
        
    } catch (error) {
        console.error('Error loading random meals:', error);
        showError('Gagal memuat resep acak');
    }
}

// Handle search
async function handleSearch() {
    const searchTerm = searchInput.value.trim();
    const category = categoryFilter.value;
    const area = areaFilter.value;
    
    try {
        showLoading('Mencari resep...');
        
        let meals = [];
        
        if (searchTerm) {
            // Search by name
            const response = await fetch(`${MEAL_API_URL}search.php?s=${searchTerm}`);
            const data = await response.json();
            meals = data.meals || [];
        } else if (category || area) {
            // Filter by category and/or area
            if (category && area) {
                const catResponse = await fetch(`${MEAL_API_URL}filter.php?c=${category}`);
                const catData = await catResponse.json();
                const mealIds = catData.meals?.map(meal => meal.idMeal) || [];
                
                // Check each meal's area
                const detailedMeals = await Promise.all(
                    mealIds.map(id => fetchMealDetails(id))
                );
                meals = detailedMeals.filter(meal => meal?.strArea === area);
            } else if (category) {
                const response = await fetch(`${MEAL_API_URL}filter.php?c=${category}`);
                const data = await response.json();
                meals = await Promise.all(
                    (data.meals || []).slice(0, 20).map(meal => fetchMealDetails(meal.idMeal))
                );
            } else if (area) {
                const response = await fetch(`${MEAL_API_URL}filter.php?a=${area}`);
                const data = await response.json();
                meals = await Promise.all(
                    (data.meals || []).slice(0, 20).map(meal => fetchMealDetails(meal.idMeal))
                );
            }
        } else {
            // No filters - show random
            await loadRandomMeals();
            return;
        }
        
        displayMeals(meals.filter(Boolean));
        
    } catch (error) {
        console.error('Search error:', error);
        showError('Gagal mencari resep');
    }
}

// Handle filter changes
function handleFilterChange() {
    if (!searchInput.value.trim()) {
        handleSearch();
    }
}

// Fetch meal details
async function fetchMealDetails(mealId) {
    try {
        const response = await fetch(`${MEAL_API_URL}lookup.php?i=${mealId}`);
        const data = await response.json();
        return data.meals?.[0] || null;
    } catch (error) {
        console.error('Error fetching meal details:', error);
        return null;
    }
}

// Display meals
function displayMeals(meals) {
    mealContainer.innerHTML = '';
    
    if (meals.length === 0) {
        showNoResults();
        return;
    }
    
    meals.forEach(meal => {
        const mealCard = document.createElement('div');
        mealCard.className = 'meal-card';
        mealCard.innerHTML = `
            <div class="meal-img-container">
                <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="meal-img">
            </div>
            <div class="meal-info">
                <h3>${meal.strMeal}</h3>
                <p class="meal-meta">
                    ${meal.strCategory || 'No category'} • ${meal.strArea || 'No region'}
                </p>
                <button class="detail-btn">Lihat Resep</button>
            </div>
        `;
        mealCard.querySelector('.detail-btn').addEventListener('click', () => showMealModal(meal));
        mealContainer.appendChild(mealCard);
    });
}

// Show meal modal
function showMealModal(meal) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Get ingredients list
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
            ingredients.push({
                name: ingredient,
                measure: measure || 'Secukupnya'
            });
        }
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="close-btn">&times;</button>
            <h2>${meal.strMeal}</h2>
            
            <div class="modal-img-container">
                <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="modal-img">
                <div class="meal-tags">
                    ${meal.strCategory ? `<span class="tag">${meal.strCategory}</span>` : ''}
                    ${meal.strArea ? `<span class="tag">${meal.strArea}</span>` : ''}
                    ${meal.strTags ? meal.strTags.split(',').map(tag => 
                        `<span class="tag">${tag.trim()}</span>`).join('') : ''}
                </div>
            </div>
            
            <div class="modal-body">
                <div class="ingredients-section">
                    <h3>Bahan-bahan</h3>
                    <div class="ingredients-list">
                        ${ingredients.map(ing => `
                            <div class="ingredient-item">
                                <span class="ingredient-name">${ing.name}</span>
                                <span class="ingredient-measure">${ing.measure}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="instructions-section">
                    <h3>Cara Membuat</h3>
                    <div class="instructions-text">
                        ${formatInstructions(meal.strInstructions)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });
    
    // Show modal with slight delay for animation
    setTimeout(() => modal.classList.add('active'), 10);
}

// Format instructions
function formatInstructions(instructions) {
  if (!instructions) return '<p>Tidak ada instruksi tersedia</p>';
  
  // Preserve original formatting with line breaks
  return `<div class="original-instructions">${instructions.replace(/\r\n/g, '<br>')}</div>`;
}

// Show loading state
function showLoading(message) {
    mealContainer.innerHTML = `
        <div class="loading">
            <p>${message}</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    mealContainer.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button class="retry-btn" onclick="location.reload()">Coba Lagi</button>
        </div>
    `;
}

// Show no results message
function showNoResults() {
    mealContainer.innerHTML = `
        <div class="no-results">
            <p>Tidak ada resep yang ditemukan</p>
            <button class="retry-btn" onclick="loadRandomMeals()">Tampilkan Resep Acak</button>
        </div>
    `;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);