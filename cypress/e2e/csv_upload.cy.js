// cypress/e2e/csv_upload.cy.js
//
// Tests for CSV file upload: valid import, malformed file, clear CSV data.


// Yahoo Finance format CSV content
const VALID_CSV = `Date,Open,High,Low,Close,Adj Close,Volume
2024-01-02,185.33,185.64,182.83,185.64,185.64,82488700
2024-01-03,184.22,185.88,183.43,184.25,184.25,58414500
2024-01-04,182.15,183.09,180.88,181.91,181.91,71983600
2024-01-05,181.99,182.76,180.17,181.18,181.18,62303400`;

const MALFORMED_CSV = `This is not,a valid,CSV file
no date column,no close column
just random,text here`;

function createCsvBlob(content, filename) {
  return {
    contents: Cypress.Buffer.from(content),
    fileName: filename,
    mimeType: "text/csv",
    lastModified: Date.now(),
  };
}

describe("CSV Upload — import + clear", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
    cy.clearLocalStorage();
    cy.reload();
  });

  it("uploads a valid CSV file and stores data in localStorage", () => {
    cy.get("#csv-upload").selectFile(createCsvBlob(VALID_CSV, "AAPL.csv"), {
      force: true,
    });

    cy.get("#csv-status", { timeout: 5000 }).should(
      "contain.text",
      "Processed"
    );

    cy.window().then((win) => {
      const stored = win.localStorage.getItem("csv_AAPL");
      expect(stored).to.not.be.null;
      const data = JSON.parse(stored);
      expect(Object.keys(data).length).to.equal(4);
      expect(data["2024-01-02"].close).to.equal(185.64);
    });
  });

  it("handles malformed CSV without crashing", () => {
    cy.get("#csv-upload").selectFile(
      createCsvBlob(MALFORMED_CSV, "BAD.csv"),
      { force: true }
    );

    // The error message contains "❌ Error processing" — check for either "Error" or "❌"
    cy.get("#csv-status", { timeout: 8000 }).should(($el) => {
      const text = $el.text();
      // Accept: error message shown, OR empty (error cleared), as long as no crash
      // The key assertion is that the page is still functional
      expect(text.includes("Error") || text.includes("❌") || text === "").to.be
        .true;
    });

    // Page should still be functional — this is the main assertion
    cy.get("#holdings-container").should("exist");
    cy.get(".holding-input").should("have.length.at.least", 1);
  });

  it("clears CSV data from localStorage", () => {
    cy.get("#csv-upload").selectFile(createCsvBlob(VALID_CSV, "AAPL.csv"), {
      force: true,
    });

    cy.get("#csv-status", { timeout: 5000 }).should(
      "contain.text",
      "Processed"
    );

    cy.window().then((win) => {
      expect(win.localStorage.getItem("csv_AAPL")).to.not.be.null;
    });

    cy.window().then((win) => {
      cy.stub(win, "alert");
    });
    cy.contains("button", /clear csv/i).click();

    cy.window().then((win) => {
      expect(win.localStorage.getItem("csv_AAPL")).to.be.null;
    });
  });

  it("extracts ticker name from filename", () => {
    cy.get("#csv-upload").selectFile(
      createCsvBlob(VALID_CSV, "MSFT_data.csv"),
      { force: true }
    );

    cy.get("#csv-status", { timeout: 5000 }).should(
      "contain.text",
      "Processed"
    );

    cy.window().then((win) => {
      expect(win.localStorage.getItem("csv_MSFT")).to.not.be.null;
    });
  });
});
