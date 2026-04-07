const generateNextToken = (shop) => {
    shop.currentTokenNumber += 1;

    return {
        tokenNumber: shop.currentTokenNumber,
        tokenLabel: `${shop.queuePrefix}-${String(shop.currentTokenNumber).padStart(3, "0")}`
    };
};

module.exports = generateNextToken;
