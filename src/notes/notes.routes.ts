import { Router } from "express";
import { getNotes, createNote, deleteNote, shareNoteToFeed } from "./controllers/notes_controller";

const notesV1Router = Router();

notesV1Router.get("/notes", getNotes);
notesV1Router.post("/notes", createNote);
notesV1Router.delete("/notes/:id", deleteNote);
notesV1Router.post("/notes/:id/share", shareNoteToFeed);

export default notesV1Router;