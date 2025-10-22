// Test script to verify Logbook filtering logic
const testData = [
    { id: "user1_123", username: "user1", loginTimeIST: "10:00", logoutTimeIST: "11:00", tasksDone: ["task1"] },
    { id: "user2_124", username: "user2", loginTimeIST: "10:30", logoutTimeIST: "12:00", tasksDone: ["task2"] },
    { id: "user1_125", username: "user1", loginTimeIST: "14:00", logoutTimeIST: "15:00", tasksDone: ["task3"] },
    { id: "user3_126", username: "user3", loginTimeIST: "16:00", logoutTimeIST: "17:00", tasksDone: ["task4"] }
];

// Simulate the filtering logic from Logbook.js
function filterUserData(data, username) {
    return data.filter(log => log.username === username);
}

// Test the filtering
console.log("Original data:", testData);
console.log("Filtered for user1:", filterUserData(testData, "user1"));
console.log("Filtered for user2:", filterUserData(testData, "user2"));
console.log("Filtered for user3:", filterUserData(testData, "user3"));

// Test with real API data format
const realAPIData = [
    {
        "id": "Himasri_22/09/2025, 11:05:05",
        "loginTimeIST": "22/09/2025, 11:05:05",
        "logoutTimeIST": null,
        "tasksDone": [],
        "username": "Himasri"
    },
    {
        "id": "testuser_22/09/2025, 12:00:00",
        "loginTimeIST": "22/09/2025, 12:00:00",
        "logoutTimeIST": "22/09/2025, 13:00:00",
        "tasksDone": ["Added sentence", "Edited sentence"],
        "username": "testuser"
    }
];

console.log("\nReal API data test:");
console.log("All data:", realAPIData);
console.log("Filtered for Himasri:", filterUserData(realAPIData, "Himasri"));
console.log("Filtered for testuser:", filterUserData(realAPIData, "testuser"));
