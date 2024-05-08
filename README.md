![Vectara Logo](resources/images/vectara-logo.png)

# Vectara Meetup Chatbot

This repository contains a series of notebooks that simulate
the corpus creation, data prep and ingest required to
build a RAG powered chatbot.

## Getting Started
To use this:

1. Setup vectara-skunk-client YAML file: https://github.com/davidglevy/vectara-skunk-client
2. Setup Jupyter Lab: https://jupyter.org/

The notebooks are in the notebooks folder.

## Features and Roadmap

1. Corpus Creation: Done, embedded in notebooks
2. Filter Attributes: Done, see [02 Presentation Corpus](resources/notebooks/02%20Presentation%20Corpus.ipynb)
3. Data Loading: Done, each notebook loads it's data.
4. Crawling: Outstanding; currently data is static in repo
5. Webhook: Partial: working with Chatbot.com parameters/flow
6. Upload to Corpus: Partial; I have webhook downloading Chatbot.com CDN but need to then push to Corpus
7. Custom Prompts: Not Done, once we have actions working well, I'll introduce this.
8. Memory: Not Done (beyond Chat API memory), I will add a memory of conversation to inject into custom prompt.
9. Action Aspect: Not Done, I will add this soon to intercept conversation which expects an action.