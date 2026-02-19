// utils/tokenGenerator.js

const generateNextToken = (shop) => {
    shop.currentToken += 1;
    return shop.currentToken;
};

module.exports = generateNextToken;
