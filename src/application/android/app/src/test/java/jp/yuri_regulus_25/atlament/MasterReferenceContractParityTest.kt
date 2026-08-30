package jp.yuri_regulus_25.atlament

import kotlin.test.Test
import kotlin.test.assertEquals

class MasterReferenceContractParityTest {
    @Test
    fun resolvesMissingAndDeletedStatesWithSharedContractValues() {
        assertEquals("missing", androidMasterReferenceResolutionState(null, deleted = false))
        assertEquals("missing", androidMasterReferenceResolutionState("", deleted = true))
        assertEquals("deleted", androidMasterReferenceResolutionState("deleted-machine", deleted = true))
        assertEquals("resolved", androidMasterReferenceResolutionState("known-machine", deleted = false))
    }

    @Test
    fun emitsSharedWarningCodesForUnresolvedReferences() {
        assertEquals("MASTER_REFERENCE_MISSING", androidMasterReferenceWarningCode(deleted = false))
        assertEquals("MASTER_REFERENCE_DELETED", androidMasterReferenceWarningCode(deleted = true))
    }
}
