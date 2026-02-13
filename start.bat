@echo off
echo Starting Invoice App...
start cmd /k "cd backend && nodemon index.js"
start cmd /k "cd frontend && npm start"