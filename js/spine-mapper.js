window.ArohaSpineMapper = {
    vertebrae: [
        { id: 1, name: "Atlas (C1)", element: "Iron (Fe)", freqOffset: 0.0 },
        { id: 2, name: "Axis (C2)", element: "Copper (Cu)", freqOffset: 0.27 },
        { id: 3, name: "C3", element: "Gold (Au)", freqOffset: 0.54 },
        { id: 4, name: "C4", element: "Silver (Ag)", freqOffset: 0.81 },
        { id: 5, name: "C5", element: "Zinc (Zn)", freqOffset: 1.08 },
        { id: 6, name: "C6", element: "Tin (Sn)", freqOffset: 1.35 },
        { id: 7, name: "C7", element: "Lead (Pb)", freqOffset: 1.62 },
        // Expanded 33 vertebrae mapping stub
        { id: 33, name: "Coccyx (Co4)", element: "Crystal Quartz", freqOffset: 8.64 }
    ],
    getVertebra(index) {
        return this.vertebrae[index % this.vertebrae.length];
    }
};
