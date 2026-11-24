/* AI for CSOs: question pool (10 questions, ids 201-210), the Participant Workbook quiz.
 * Every event of the package uses all 10 questions, before (pre) and after (post) the day.
 * c: complexity 1 = simple, 2 = medium, 3 = complex. s: topic (assessment SESSIONS).
 * The correct answers and explanations are not in this file: they are kept in the database
 * (question_keys), readable only by the trainer, and tests are scored there. */
var POOL_CSO = [
 {id:201,c:1,s:0,q:"A chatbot without web search mainly works by:",o:["Searching the internet live","Looking up a verified database","Predicting likely next words from patterns","Copying from Wikipedia"]},
 {id:202,c:1,s:0,q:"In AI, \"hallucination\" means:",o:["The AI stops working","Confident output that is false or invented","The AI creates images","A slow internet connection"]},
 {id:203,c:2,s:2,q:"Which part of R-C-T-F-C tells the AI the audience, place and purpose?",o:["Role","Task","Format","Context"]},
 {id:204,c:2,s:5,q:"Which is safest to paste into a free AI tool?",o:["A public government policy document","A beneficiary list with phone numbers","A case file with only the name removed","The staff salary sheet"]},
 {id:205,c:1,s:1,q:"Which tool answers only from documents you upload, with citations?",o:["ChatGPT","NotebookLM","Gboard","Claude"]},
 {id:206,c:2,s:5,q:"AI gives you a statistic with a source link. You should:",o:["Use it, because the link looks official","Ask the AI \"are you sure?\"","Open the source and confirm the figure is there","Round the number and use it"]},
 {id:207,c:3,s:3,q:"An AI-written proposal section reads very well. Before submitting, you should:",o:["Submit it as it is","Verify the facts, check the donor criteria, and rewrite it in your own voice","Translate it into Nepali","Ask AI to make it longer"]},
 {id:208,c:2,s:5,q:"Which is an example of bias in AI output?",o:["A spelling mistake","A slow answer","Always showing leaders as men and caregivers as women","An answer that is too long"]},
 {id:209,c:1,s:1,q:"On an Android phone, you type Nepali by voice by:",o:["Using the paid version of ChatGPT only","This is not possible","Using the calculator app","Using Gboard with Nepali added, then tapping the microphone"]},
 {id:210,c:2,s:5,q:"Who is accountable for AI-assisted content that a CSO publishes?",o:["The staff member and the CSO","The AI company","The AI tool","The donor"]}
];

/* The event set: all 10 questions, in random order. */
function pickCsoSet(){
  var ids = POOL_CSO.map(function(q){return q.id;});
  for (var i = ids.length-1; i > 0; i--) { var j = Math.floor(Math.random()*(i+1)); var t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
  return ids;
}
