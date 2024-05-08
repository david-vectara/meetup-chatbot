'use strict';

const vectara = require('vectara')
//import { Factory } from 'vectara';
const util = require('util');
const https = require('https'); // or 'https' for https:// URLs
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json()); // creates http server
const token = 'sticky_tap3_4nd_Gloo'; // type your verification token here

let client = undefined;
let mckinsey_corpusId = undefined;
const GUARDRAILS_CORPUS_NAME = "prompt-guardrails"


async function startServer() {
    client = await new vectara.Factory().build();

    const corporaResp = await client.adminService.listCorpora(GUARDRAILS_CORPUS_NAME);

    corporaResp.corpus.forEach((corpus) => {
        console.info("Found corpus [" + corpus.name + "]");
        if (corpus.name === GUARDRAILS_CORPUS_NAME) {
            console.info("We found target corpus [" + corpus.id + "]")
            mckinsey_corpusId = corpus.id;
        }
    });

    console.info("Post-Initialization of client");

    // delayed listening of your app
    app.listen(3000, () => console.log('[ChatBot] Webhook is listening'));

}


// app.listen() part should always be located in the last line of your code
app.get('/', (req, res) => {
    // check if verification token is correct
    if (req.query.token !== token) {
        return res.sendStatus(401); // if not, return unauthorized error
    }

    // return challenge
    return res.end(req.query.challenge);
});
app.post('/', async (req, res) => {
    // check if verification token is correct
    if (req.query.token !== token) {
        return res.sendStatus(401);
    }

    // print request body
    console.log(req.body);
    console.log(req.query);

    console.info("We have a query of type [" + req.body.attributes.queryType + "]")
    if (req.body.attributes.queryType === "Upload" && req.body.attributes.attachment !== 'undefined') {
        console.log("We will download and index the attachment in the CDN")
        const cdnPath = req.body.attributes.attachment;
        console.log("CDN Path is: " + cdnPath);
        const splitPath = cdnPath.split("/");
        const localFile = splitPath[splitPath.length-1];
        console.log("Local file is: " + localFile)

        const file = fs.createWriteStream(localFile);

        // TODO Await completion
        const request = https.get(cdnPath, function (response) {
            response.pipe(file);

            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                console.log("Download Completed");
            });
        });
        res.json({responses: [
                {
                    type: 'text',
                    message: "Thanks, I received the file " + localFile
                }

            ]});
    } else if (req.body.attributes.queryType === "general") {
        console.log("Asking question: " + req.body.message)
        const queryFacade = client.queryFacade;
        try {
            const response = await queryFacade.simple(req.body.message, mckinsey_corpusId);

            const summaryText = response.summary[0].text;
            console.log("Summary text was: " + summaryText)
            const data = {
                responses: [
                    {
                        type: 'text',
                        message: summaryText
                    }

                ]
            }
            console.log("Returning data")
            res.json(data);
        } catch (e) {
            console.error("Unexpected error: " + e.message)
        }

    } else {

        console.info("Retrieving Corpora");
        // Get the corpus information
        const listCorporaResp = await client.adminService.listCorpora();
        const corpusButtons = []
        listCorporaResp.corpus.forEach((corpus) => {
            console.info("Adding button " + corpus.name);
            corpusButtons.push({
                type: "postback",
                title: corpus.name,
                value: '' + corpus.id
            });
        });

        console.info("packing [" + corpusButtons.length + "] buttons")
        // return a text response
        const data = {
            responses: [
                // {
                //     type: 'text',
                //     message: "Based on your question, please select your preferred organisation"
                // },
                {
                    type: "quickReplies",
                    title: "foobar",
                    buttons: corpusButtons
                    // buttons: [
                    //     {
                    //         type: "postback",
                    //         title: "NRMA",
                    //         value: "nrma1"
                    //     },
                    //     {
                    //         type: "postback",
                    //         title: "Amy",
                    //         value: "Amy1"
                    //     }
                    // ]

                }
            ],
            "attributes": {
                "vectara_response": "Thanks for your question" + req.body.message + ", here's my response bla bla bla. Does that answer your question?"
            },

        };


        res.json(data);
    }

});

startServer();

