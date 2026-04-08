package util

// Abs returns the absolute value of an int.
func Abs(value int) int {
	if value < 0 {
		return -value
	}
	return value
}
