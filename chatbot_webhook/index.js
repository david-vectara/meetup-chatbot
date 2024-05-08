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
let general_corpus_id = undefined;
let meetup_corpus_id = undefined;
let action_corpus_id = undefined;
const GENERAL_CORPUS = "meetup-general"
const ACTION_CORPUS = "meetup-actions"
const MEETUP_CORPUS = "meetup-presentations"
const actionButtons = []

async function startServer() {
    // Temporarily test this string
    const testString = "action=meetup-info"
    const res = [
        RegExp(".*"),
        RegExp("[a-z]+=.*"),
        RegExp("([\\w]+)=(.*)")
    ];
    res.forEach(re => {
        console.log("Testing " + re.source + " on " + testString + " which is [" + re.test(testString) + "]");
    });
    console.log("Testing match capability: " + testString.match(res[2])[2])


    client = await new vectara.Factory().build();

    const corporaResp = await client.adminService.listCorpora("meetup-");

    corporaResp.corpus.forEach((corpus) => {
        if (corpus.name === GENERAL_CORPUS) {
            console.info("We found general corpus [" + corpus.id + "]")
            general_corpus_id = corpus.id;
        }
        if (corpus.name === MEETUP_CORPUS) {
            console.info("We found presentation corpus [" + corpus.id + "]")
            meetup_corpus_id = corpus.id;
        }
        if (corpus.name === ACTION_CORPUS) {
            console.info("We found action corpus [" + corpus.id + "]")
            action_corpus_id = corpus.id;
        }
    });

    const queryFacade = client.queryFacade;
    const queryService = client.queryService;
    const queryBody = queryFacade.buildTemplate("What can we do", action_corpus_id)
    queryBody.summary = []
    const batchRequest = {
        query: [
            queryBody
        ]
    }

    const actionResponse = await queryService.query(batchRequest)
    actionResponse.responseSet.forEach(response => {
        response.document.forEach(document => {
            document.metadata.forEach(metadata => {
                if (metadata.name === "action-key") {
                    console.info("Adding action [" + metadata.value + "]")
                    actionButtons.push({
                        type: "postback",
                        title: document.id,
                        value: "action=" + metadata.value
                    });
                }

            })

        })

    })


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
    //console.log(req.body);
    //console.log(req.query);

    console.info("We have a query of type [" + req.body.attributes.queryType + "]")
    if (req.body.attributes.queryType === "Upload" && req.body.attributes.attachment !== 'undefined') {
        console.log("We will download and index the attachment in the CDN")
        const cdnPath = req.body.attributes.attachment;
        console.log("CDN Path is: " + cdnPath);
        const splitPath = cdnPath.split("/");
        const localFile = splitPath[splitPath.length - 1];
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
        res.json({
            responses: [
                {
                    type: 'text',
                    message: "Thanks, I received the file " + localFile
                }

            ]
        });
    } else if (req.body.attributes.queryType === "general") {

        const queryFacade = client.queryFacade;
        const queryService = client.queryService;

        const re = RegExp("([\\w]+)=([^=]+)")
        // The entry here will be after a quick response has been selected
        if (req.body.message !== undefined && re.test(req.body.message)) {
            const matches = req.body.message.match(re);
            const key = matches[1];
            const value = matches[2];
            console.log("Found command with [" + key + "] = [" + value + "]");
            if (key === "action") {
                console.log("We have an action!! " + value);

                // Now we set the action on a return attribute.
                const data = {
                    responses: [
                        {
                            attributes: {
                                "action": value
                            }
                        },
                    ]
                }
                res.json(data);
                return;
            }


        } else {
            console.log("Asking question: " + req.body.message)
        }


        if (req.body.attributes.action === undefined) {
            const data = {
                responses: [
                    {
                        type: "quickReplies",
                        title: "Please select an action",
                        buttons: actionButtons
                    }
                ]
            }
            res.json(data);

        } else {

            try {
                const response = await queryFacade.simple(req.body.message, general_corpus_id);

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

