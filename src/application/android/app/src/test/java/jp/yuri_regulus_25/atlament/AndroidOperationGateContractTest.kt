package jp.yuri_regulus_25.atlament

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidOperationGateContractTest {
    @Test
    fun keepsWriteLikeOperationsMutuallyExclusive() {
        val gate = AndroidOperationGate()

        assertTrue(gate.tryStart("startup"))
        assertFalse(gate.tryStart("manualSync"))
        assertFalse(gate.tryStart("configurationUpdate"))
        assertFalse(gate.tryStart("credentialUpdate"))
        assertFalse(gate.tryStart("recoveryCommit"))

        gate.complete("startup", true)
        assertEquals("completed", gate.snapshot().startup)
        assertTrue(gate.tryStart("manualSync"))
        gate.complete("manualSync", false)
        assertEquals("failed", gate.snapshot().manualSync)
    }

    @Test
    fun keepsShutdownBlockingNewOperations() {
        val gate = AndroidOperationGate()

        assertTrue(gate.tryStart("shutdown"))
        assertFalse(gate.tryStart("manualSync"))
        assertFalse(gate.tryStart("shutdown"))

        gate.complete("shutdown", true)
        assertEquals("completed", gate.snapshot().shutdown)
    }
}
