# Stockle

Stockle is a financial puzzle game inspired by Wordle. Every day, a new stock is chosen as the "Stock of the Day," and your goal is to guess it within a limited number of attempts.

## How to Play

1.  **Search & Select**: Type a company name or ticker in the search box.
2.  **Analyze Attributes**: After each guess, the game provides feedback on how close your selection is to the target stock based on several attributes:
    - **Sector**: Industry category.
    - **Country**: Base of operations.
    - **Exchange**: Where the stock is traded (e.g., NASDAQ, NYSE).
    - **Market Cap**: Company valuation (Higher/Lower indicators).
    - **P/E Ratio**: Price-to-earnings ratio (Higher/Lower indicators).
    - **And more...**
3.  **Color Indicators**:
    - 🟩 **Green**: Correct attribute.
    - 🟥 **Red**: Incorrect categorical attribute.
    - ⬆️ **Up Arrow**: The target value is higher.
    - ⬇️ **Down Arrow**: The target value is lower.

## Features

- **Keyboard First**: Fully playable using `Tab`, `Arrow Keys`, and `Enter`.
- **Responsive Design**: Optimized for desktop and mobile, with horizontal scrolling for data-heavy tables on small screens.
- **Daily Challenge**: The target stock is deterministic based on the current date.
- **Modern UI**: Dark-themed, high-contrast interface with interactive feedback.

## Tech Stack

- **React** (TypeScript)
- **Vite**
- **Vanilla CSS**

## Getting Started

1.  Install dependencies: `npm install`
2.  Start development server: `npm run dev`
3.  Build for production: `npm run build`
