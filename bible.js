/* =================================
   KFGC HOLY BIBLE READER
   Main JavaScript Controller
================================= */

const books = [
"Genesis","Exodus","Leviticus","Numbers",
"Deuteronomy","Joshua","Judges","Ruth",
"1 Samuel","2 Samuel","1 Kings","2 Kings",
"1 Chronicles","2 Chronicles","Ezra","Nehemiah",
"Esther","Job","Psalms","Proverbs",
"Ecclesiastes","Song of Solomon","Isaiah",
"Jeremiah","Lamentations","Ezekiel","Daniel",
"Hosea","Joel","Amos","Obadiah","Jonah",
"Micah","Nahum","Habakkuk","Zephaniah",
"Haggai","Zechariah","Malachi",
"Matthew","Mark","Luke","John","Acts",
"Romans","1 Corinthians","2 Corinthians",
"Galatians","Ephesians","Philippians",
"Colossians","1 Thessalonians","2 Thessalonians",
"1 Timothy","2 Timothy","Titus","Philemon",
"Hebrews","James","1 Peter","2 Peter",
"1 John","2 John","3 John","Jude","Revelation"
];

const chapterCounts = [
50,40,27,36,34,24,21,4,31,24,22,25,
29,36,10,13,10,42,150,31,12,8,66,52,
5,48,12,14,3,9,1,4,7,3,3,3,2,14,
4,28,16,24,21,28,16,16,13,6,6,4,
4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22
];

const bookIds = {
"Genesis":"GEN","Exodus":"EXO",
"Leviticus":"LEV","Numbers":"NUM",
"Deuteronomy":"DEU","Joshua":"JOS",
"Judges":"JDG","Ruth":"RUT",
"1 Samuel":"1SA","2 Samuel":"2SA",
"1 Kings":"1KI","2 Kings":"2KI",
"1 Chronicles":"1CH","2 Chronicles":"2CH",
"Ezra":"EZR","Nehemiah":"NEH",
"Esther":"EST","Job":"JOB",
"Psalms":"PSA","Proverbs":"PRO",
"Ecclesiastes":"ECC","Song of Solomon":"SNG",
"Isaiah":"ISA","Jeremiah":"JER",
"Lamentations":"LAM","Ezekiel":"EZK",
"Daniel":"DAN","Hosea":"HOS",
"Joel":"JOL","Amos":"AMO",
"Obadiah":"OBA","Jonah":"JON",
"Micah":"MIC","Nahum":"NAM",
"Habakkuk":"HAB","Zephaniah":"ZEP",
"Haggai":"HAG","Zechariah":"ZEC",
"Malachi":"MAL","Matthew":"MAT",
"Mark":"MRK","Luke":"LUK",
"John":"JHN","Acts":"ACT",
"Romans":"ROM","1 Corinthians":"1CO",
"2 Corinthians":"2CO","Galatians":"GAL",
"Ephesians":"EPH","Philippians":"PHP",
"Colossians":"COL",
"1 Thessalonians":"1TH",
"2 Thessalonians":"2TH",
"1 Timothy":"1TI","2 Timothy":"2TI",
"Titus":"TIT","Philemon":"PHM",
"Hebrews":"HEB","James":"JAS",
"1 Peter":"1PE","2 Peter":"2PE",
"1 John":"1JN","2 John":"2JN",
"3 John":"3JN","Jude":"JUD",
"Revelation":"REV"
};

/* PAGE ELEMENTS */

const bookSelect = document.getElementById("book");
const chapterSelect = document.getElementById("chapter");
const languageSelect = document.getElementById("language");

/* LOAD BOOKS */

books.forEach((name,index)=>{

const option = document.createElement("option");

option.value = name;
option.textContent = name;

bookSelect.appendChild(option);

});

/* LOAD CHAPTERS */

function loadChapters(){

const book = bookSelect.value;
const index = books.indexOf(book);

chapterSelect.innerHTML = "";

for(let i=1;i<=chapterCounts[index];i++){

const option = document.createElement("option");

option.value = i;
option.textContent = "Chapter " + i;

chapterSelect.appendChild(option);

}

loadBible();

}

/* LOAD BIBLE CHAPTER */

async function loadBible(){

const book = bookSelect.value;
const chapter = Number(chapterSelect.value);
const language = languageSelect.value;

if(!book || !chapter) return;

document.getElementById("heading").textContent =
book + " Chapter " + chapter;

document.getElementById("status").textContent =
"Loading Scripture...";

document.getElementById("content").innerHTML = "";
loadNotes();
try{

let url;

if(language === "KJV"){

const slug = book.toLowerCase().replace(/ /g,"-");

url =
"https://api.midvash.com/v1/kjv/" +
slug + "/" + chapter;

}else{

url =
"https://bible.helloao.org/api/lug_bib/" +
bookIds[book] + "/" + chapter + ".json";

}

const response = await fetch(url);

if(!response.ok){

throw new Error("Unable to connect to Bible server.");

}

const result = await response.json();

let verses = [];

if(language === "KJV"){

const data = result.data?.verses || result.verses;

if(!data) throw new Error("Bible verses not found.");

verses = data.map((v,index)=>({

verse: v.verse || v.number || index+1,

text: typeof v === "string" ? v : v.text

}));

}else{

const content = result.chapter?.content || [];

verses = content
.filter(item => item.type === "verse")
.map(item => ({

verse: item.number,

text: item.content
.map(part => {

if(typeof part === "string") return part;

return "";

})
.join("")

}));

}

if(!verses.length){

throw new Error("No verses found in this chapter.");

}

document.getElementById("status").textContent = "";

displayVerses(verses);

localStorage.setItem("kfgcBook",book);
localStorage.setItem("kfgcChapter",chapter);
localStorage.setItem("kfgcLanguage",language);

}catch(error){

document.getElementById("status").textContent =
"Bible Error: " + error.message;

console.error(error);

}

}

/* DISPLAY BIBLE VERSES */

function displayVerses(verses){

const content = document.getElementById("content");

content.innerHTML = "";

verses.forEach(v=>{

const row = document.createElement("div");

row.className = "verse";

row.style.padding = "13px 5px";
row.style.borderBottom = "1px solid #eee";
row.style.lineHeight = "2";

const number = document.createElement("strong");

number.textContent = v.verse + ". ";

number.style.color = "#d9a441";

const text = document.createTextNode(v.text + " ");

const save = document.createElement("button");

save.textContent = "☆";
save.className = "gold-btn";
save.style.padding = "5px 9px";
save.style.float = "right";

save.onclick = ()=>{

bookmark(
bookSelect.value,
chapterSelect.value,
v.verse,
v.text
);

};

row.append(number,text,save);

content.appendChild(row);

});

}


/* CHAPTER NAVIGATION */

function changeChapter(direction){

let current = Number(chapterSelect.value);

let maximum = chapterCounts[
books.indexOf(bookSelect.value)
];

current += direction;

if(current < 1 || current > maximum){

return;

}

chapterSelect.value = current;

loadBible();

}


/* BOOK AND CHAPTER EVENTS */

bookSelect.addEventListener("change",()=>{

loadChapters();

});

chapterSelect.addEventListener("change",()=>{

loadBible();

});

languageSelect.addEventListener("change",()=>{

loadBible();

});


/* RESTORE LAST READING */

const savedBook = localStorage.getItem("kfgcBook");

const savedChapter = localStorage.getItem("kfgcChapter");

if(savedBook && books.includes(savedBook)){

bookSelect.value = savedBook;

}

loadChapters();

if(savedChapter){

chapterSelect.value = savedChapter;

loadBible();

}

/* =========================
   BIBLE BOOKMARKS
========================= */

function bookmark(book,chapter,verse,text){

let saved = JSON.parse(
localStorage.getItem("kfgcBookmarks") || "[]"
);

let exists = saved.some(v=>
v.book===book &&
v.chapter===chapter &&
v.verse===verse
);

if(exists){

alert("This verse is already saved!");

return;

}

saved.push({
book,
chapter,
verse,
text
});

localStorage.setItem(
"kfgcBookmarks",
JSON.stringify(saved)
);

alert("Bible verse saved successfully!");

}


/* SHOW BOOKMARKS */

function showBookmarks(){

let panel = document.getElementById("bookmarkPanel");

panel.style.display =
panel.style.display==="none" ? "block" : "none";

displayBookmarks();

}


/* DISPLAY SAVED VERSES */

function displayBookmarks(){

let saved = JSON.parse(
localStorage.getItem("kfgcBookmarks") || "[]"
);

let area = document.getElementById("savedVerses");

area.innerHTML = "";

if(saved.length===0){

area.textContent = "No saved Bible verses yet.";

return;

}

saved.forEach((v,index)=>{

let item = document.createElement("div");

item.style.padding = "12px";
item.style.borderBottom = "1px solid #ddd";

let title = document.createElement("strong");

title.textContent =
v.book+" "+v.chapter+":"+v.verse;

let text = document.createElement("p");

text.textContent = v.text;

text.style.margin = "8px 0";

let remove = document.createElement("button");

remove.textContent = "Remove";
remove.className = "primary-btn";

remove.onclick = ()=>{

saved.splice(index,1);

localStorage.setItem(
"kfgcBookmarks",
JSON.stringify(saved)
);

displayBookmarks();

};

item.append(title,text,remove);

area.appendChild(item);

});

}


/* =========================
   BIBLE STUDY NOTES
========================= */

function getNoteKey(){

return "kfgc_notes_" +
bookSelect.value + "_" +
chapterSelect.value;

}


/* SAVE NOTES */

function saveNotes(){

let notes = document.getElementById("studyNotes").value;

localStorage.setItem(
getNoteKey(),
notes
);

document.getElementById("noteMessage").textContent =
"✓ Your Bible study notes have been saved!";

}


/* LOAD NOTES */

function loadNotes(){

let notes = localStorage.getItem(getNoteKey()) || "";

document.getElementById("studyNotes").value = notes;

document.getElementById("noteMessage").textContent = "";

}

/* =========================
   KFGC DAILY DEVOTIONAL
========================= */

const devotionals = [

{
title:"Walking by Faith",
verse:"2 Corinthians 5:7",
message:"Faith means trusting God even when we cannot see what lies ahead. Keep trusting His promises.",
prayer:"Heavenly Father, strengthen my faith and help me trust You every day.",
question:"Am I trusting God in every area of my life?"
},

{
title:"God's Unfailing Love",
verse:"Romans 8:39",
message:"Nothing can separate us from the love of God. His love remains constant through every season.",
prayer:"Lord, thank You for Your everlasting love. Help me share that love with others.",
question:"How can I demonstrate God's love today?"
},

{
title:"The Power of Prayer",
verse:"Philippians 4:6",
message:"Prayer gives us an opportunity to bring our worries before God and trust Him with our needs.",
prayer:"Father, teach me to pray faithfully and depend on You.",
question:"Have I made enough time for prayer?"
},

{
title:"Be Strong and Courageous",
verse:"Joshua 1:9",
message:"God calls us to be courageous because He promises to be with us wherever we go.",
prayer:"Lord, remove fear from my heart and give me courage.",
question:"What fear do I need to surrender to God?"
},

{
title:"A Heart of Forgiveness",
verse:"Ephesians 4:32",
message:"God calls us to be kind, compassionate and forgiving towards one another.",
prayer:"Father, give me a forgiving heart and help me show compassion.",
question:"Is there someone I need to forgive?"
},

{
title:"Seek God's Wisdom",
verse:"James 1:5",
message:"God invites us to ask Him for wisdom. We should seek His guidance in every decision.",
prayer:"Lord, give me wisdom to make decisions that honour You.",
question:"Am I seeking God's guidance before making decisions?"
},

{
title:"Walking in Love",
verse:"1 Corinthians 16:14",
message:"Our actions should reflect the love of Christ. Let everything we do be guided by love.",
prayer:"Jesus, help me demonstrate Your love through my words and actions.",
question:"How can I show Christ's love to someone today?"
}

];


/* LOAD TODAY'S DEVOTIONAL */

function loadDevotional(){

const start = new Date(
new Date().getFullYear(),0,0
);

const today = new Date();

const dayNumber = Math.floor(
(today-start)/(1000*60*60*24)
);

const devotional = devotionals[
(dayNumber-1)%devotionals.length
];

document.getElementById("devTitle").textContent =
devotional.title;

document.getElementById("devVerse").textContent =
devotional.verse;

document.getElementById("devMessage").textContent =
devotional.message;

document.getElementById("devPrayer").textContent =
devotional.prayer;

document.getElementById("devQuestion").textContent =
devotional.question;

const key = "kfgc_dev_" + today.toDateString();

const completed = localStorage.getItem(key);

document.getElementById("devStatus").textContent =
completed ? "✓ Today's devotional completed!" : "";

document.getElementById("completeDev").textContent =
completed ? "Completed ✓" : "Mark as Completed ✓";

}


/* MARK AS COMPLETED */

function completeDevotional(){

const key = "kfgc_dev_" +
new Date().toDateString();

localStorage.setItem(key,"true");

loadDevotional();

}


/* START DEVOTIONAL */

loadDevotional();

/* =========================
   KFGC AUDIO BIBLE
========================= */

let audioVerses = [];
let audioPosition = 0;
let bibleSpeech = null;


/* PLAY BIBLE */

function playBible(){

if(!window.speechSynthesis){

alert("Audio is not supported by this browser.");

return;

}

/* RESUME IF PAUSED */

if(speechSynthesis.paused){

speechSynthesis.resume();

document.getElementById("audioStatus").textContent =
"Audio resumed.";

return;

}

/* GET VERSES */

audioVerses = [];

document.querySelectorAll(".verse").forEach(row=>{

let copy = row.cloneNode(true);

copy.querySelector("button")?.remove();

copy.querySelector("strong")?.remove();

let text = copy.textContent.trim();

if(text){

audioVerses.push(text);

}

});

if(audioVerses.length===0){

alert("Please load a Bible chapter first.");

return;

}

speechSynthesis.cancel();

audioPosition = 0;

speakNext();

}


/* SPEAK NEXT VERSE */

function speakNext(){

if(audioPosition>=audioVerses.length){

document.getElementById("audioStatus").textContent =
"Chapter completed. God bless you!";

return;

}

bibleSpeech = new SpeechSynthesisUtterance(
audioVerses[audioPosition]
);

bibleSpeech.rate =
Number(document.getElementById("audioSpeed").value);

bibleSpeech.onend = ()=>{

audioPosition++;

speakNext();

};

bibleSpeech.onerror = ()=>{

document.getElementById("audioStatus").textContent =
"Audio playback error.";

};

document.getElementById("audioStatus").textContent =
"Playing verse " + (audioPosition+1) +
" of " + audioVerses.length;

speechSynthesis.speak(bibleSpeech);

}


/* PAUSE AUDIO */

function pauseBible(){

if(speechSynthesis.speaking){

speechSynthesis.pause();

document.getElementById("audioStatus").textContent =
"Audio paused.";

}

}


/* STOP AUDIO */

function stopBible(){

speechSynthesis.cancel();

audioPosition = 0;

document.getElementById("audioStatus").textContent =
"Audio stopped.";

}


/* CHANGE READING SPEED */

function changeSpeed(){

if(speechSynthesis.speaking){

speechSynthesis.cancel();

speakNext();

}

}
/* =========================
   BIBLE VERSE SEARCH
========================= */

function searchVerses(){

const query = document.getElementById("verseSearch")
.value.toLowerCase().trim();

const verses = document.querySelectorAll(".verse");

verses.forEach(verse=>{

const text = verse.textContent.toLowerCase();

verse.style.display =
text.includes(query) ? "block" : "none";

});

}


/* SEARCH EVENT */

document.getElementById("verseSearch")
.addEventListener("input",searchVerses);


/* AUDIO SPEED EVENT */

document.getElementById("audioSpeed")
.addEventListener("change",changeSpeed);


/* STOP AUDIO WHEN CHANGING CHAPTER */

const originalLoadBible = loadBible;

loadBible = async function(){

if(window.speechSynthesis){
speechSynthesis.cancel();
}

audioPosition = 0;

await originalLoadBible();

};


/* RESTORE LANGUAGE */

const savedLanguage = localStorage.getItem("kfgcLanguage");

if(savedLanguage){
languageSelect.value = savedLanguage;
  }
  
