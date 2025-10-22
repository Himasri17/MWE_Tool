// Test file to debug tag suggestion functionality
// Run this in the browser console to test the backend API

async function testTagSuggestion() {
    const testTexts = [
        "Google's new project",
        "Dr. Rao announced",
        "Hyderabad will launch",
        "Python framework",
        "Apple announced"
    ];

    console.log("Testing tag suggestions...");

    for (const text of testTexts) {
        try {
            console.log(`\nTesting: "${text}"`);
            const response = await fetch('http://127.0.0.1:5001/api/suggest-tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Suggestion: ${data.suggestion}`);
            } else {
                console.log(`❌ Error: ${response.status} - ${response.statusText}`);
            }
        } catch (error) {
            console.log(`❌ Network error: ${error.message}`);
        }
    }
}

// Test backend connectivity
async function testBackendConnection() {
    console.log("Testing backend connection...");

    try {
        const response = await fetch('http://127.0.0.1:5001/api/suggest-tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: "test" }),
        });

        if (response.ok) {
            console.log("✅ Backend is running and accessible");
        } else {
            console.log(`❌ Backend returned error: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Cannot connect to backend: ${error.message}`);
        console.log("💡 Make sure to start the backend server: cd Mini_task/backend && python app.py");
    }
}

// Run tests
testBackendConnection();
setTimeout(testTagSuggestion, 1000);
