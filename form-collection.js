// When the calculate button is clicked
document.getElementById('calculate-btn').addEventListener('click', () => {
    // Gather input values
    const userData = {
        distance: parseInt(document.getElementById('distance').value) || 0,
        duration: parseInt(document.getElementById('duration').value) || 0,
        vehicles: {
            car: parseInt(document.getElementById('car-count').value) || 0,
            truck: parseInt(document.getElementById('truck-count').value) || 0,
            humvee: parseInt(document.getElementById('humvee-count').value) || 0,
            cargoTruck: parseInt(document.getElementById('cargo-count').value) || 0
        },
        disasterType: document.getElementById('disaster').value
    };
    
    // Send data to API
    sendToAPI(userData);
});