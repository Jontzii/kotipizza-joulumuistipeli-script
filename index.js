import puppeteer from "puppeteer";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const roundsToPlay = parseInt(process.env.ROUNDS_TO_PLAY, 10) || 10;

const email = process.env.KOTIPIZZA_EMAIL;
if (!email) {
  console.error("Please set the KOTIPIZZA_EMAIL environment variable.");
  process.exit(1);
}

// Launch the browser and open a new blank page.
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

// Navigate the page to a URL.
await page.goto(
  "https://kotipizza.campaign.playable.com/kotijoukkojen-joulumuistipeli"
);

// Set screen size.
await page.setViewport({ width: 1080, height: 800 });

for (let round = 0; round < roundsToPlay; round++) {
  console.log(`Starting round ${round + 1} of ${roundsToPlay}`);

  // Enter email
  const emailElement = await page.$('[aria-label="Sähköpostiosoite"]');
  await emailElement.type(email);

  // Click continue
  const continueButton = await page.$('button[type="button"]');
  await continueButton.click();
  await delay(2000); // Wait for the second page to load

  // Solve the actual puzzle

  // Get all the pieces
  const amountOfPieces = 12;
  let clickedPieces = [];

  // Loop through the pieces
  for (let i = 1; i <= amountOfPieces; i++) {
    if (clickedPieces.includes(i)) {
      continue;
    }

    // Click the first piece
    const piece = await page.$(`.memory__tile--${i}`);
    clickedPieces.push(i);
    await piece.click();
    await delay(500); // Wait for the animation

    // Find the matching piece

    // Get the image of the first one
    const innerpiece = await piece.$(".memory__tile-inside");
    const firstImage = await innerpiece.$eval("img", (img) => img.src);

    // Find the other piece with the same image
    for (let j = 1; j <= amountOfPieces; j++) {
      // Skip the current one and those that are already turned
      if (clickedPieces.includes(j)) {
        continue;
      }

      const otherPiece = await page.$(`.memory__tile--${j}`);
      const otherPieceInside = await otherPiece.$(".memory__tile-inside");
      const secondImage = await otherPieceInside.$eval("img", (img) => img.src);

      if (firstImage === secondImage) {
        // Found the match!
        clickedPieces.push(j);
        await otherPiece.click();
        await delay(500); // Wait for the match animation
        break;
      }
    }
  }

  await delay(3000); // Wait for the page change

  // In case of prize win, stop here
  const pageContent = await page.content();
  if (pageContent.includes("Onnea")) {
    console.log("Win scenario. Stopping the script.");
    await delay(5000);
    break;
  }

  if (round === roundsToPlay - 1) {
    console.log("Completed all rounds. Stopping the script.");
    break;
  }

  // Find the button with text "Pelaa uudestaan!" and click it
  const playAgainButton = await page.$('button[type="button"]');
  if (playAgainButton) {
    await playAgainButton.click();
    await delay(2000); // Wait for the next round to load
  } else {
    console.warn("Play again button not found. Stopping.");
    break;
  }
}

// Close the browser
await browser.close();
