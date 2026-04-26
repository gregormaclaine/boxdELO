# boxdELO

Enter your Letterboxd username and rank every film you've watched through head-to-head comparisons. Each pick updates an ELO score, so the more you compare the more accurate your ranking gets. Results are saved to a database so you can pick up where you left off.

## How it works

1. Enter your Letterboxd username — the app scrapes your watch history
2. Pick between two films repeatedly until you're happy with the ranking
3. View your full ranked list with star ratings derived from each film's ELO score

## Requirements

- Node.js 18+
- PostgreSQL
- A free [TMDB API key](https://www.themoviedb.org/settings/api) (used for posters and metadata)

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/movie_ranker"
TMDB_API_KEY="your_key_here"
```

Run the database migrations:

```bash
npx prisma migrate dev
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```
