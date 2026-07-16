package com.janseva.test;

import com.janseva.service.HeuristicClassifier;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class UrgencyClassifierTest {
    @Test
    void pipeBurstIsHighPriorityAndConcerned() {
        var result = new HeuristicClassifier().classify(
                "test-pipe-burst",
                "A main pipe burst is causing water overflow on the road."
        );
        assertEquals("WATER", result.departmentCode);
        assertEquals("WATER.PIPE_LEAK", result.taxonomyCode);
        assertEquals("HIGH", result.priority);
        assertEquals("CONCERNED", result.sentiment);
    }

    @Test
    void specificPhrasesResolveCrossDepartmentAmbiguity() {
        var classifier = new HeuristicClassifier();
        assertEquals("BUILDING_URBAN_PLANNING.ILLEGAL_CONSTRUCTION",
                classifier.classify("building", "Illegal construction is blocking public land").taxonomyCode);
        assertEquals("TRANSPORT.RAIL_CROSSING",
                classifier.classify("rail", "The railway crossing signal is damaged").taxonomyCode);
        assertEquals("ELECTRICITY.LIVE_WIRE",
                classifier.classify("wire", "A live wire is hanging over the street").taxonomyCode);
        assertEquals("SANITATION.COLLECTION",
                classifier.classify("waste", "Garbage not collected for three days").taxonomyCode);
    }
}
