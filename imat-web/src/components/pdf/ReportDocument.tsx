import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image as PdfImage } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1a2e4a',
    paddingBottom: 15,
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  orgTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: '#1a2e4a',
  },
  subTitle: {
    fontSize: 10,
    color: '#4a5a7a',
    marginTop: 4,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f1117',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 14,
    backgroundColor: '#1a2e4a',
    color: '#ffffff',
    padding: 5,
    marginBottom: 10,
    marginTop: 15,
  },
  infoBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoCol: {
    width: '50%',
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    color: '#7a8aaa',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 11,
    color: '#0f1117',
    fontWeight: 'bold',
  },
  defectCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 15,
  },
  defectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 5,
    marginBottom: 8,
  },
  defectTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f1117',
    width: '70%',
  },
  badge: {
    fontSize: 9,
    padding: '3 6',
    backgroundColor: '#e2e8f0',
    color: '#0f1117',
  },
  badgeWarning: {
    backgroundColor: '#fef08a',
    color: '#854d0e',
  },
  badgeCritical: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
  },
  defectDetails: {
    fontSize: 10,
    color: '#4a5a7a',
    marginBottom: 10,
    lineHeight: 1.5,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  photo: {
    width: '50%',
    height: 120,
    objectFit: 'cover',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#7a8aaa',
  },
});

type Defect = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: number;
  status: string;
  campus_zones: { name: string } | null;
  photos: string[];
};

type ReportProps = {
  title: string;
  periodStart: string;
  periodEnd: string;
  authorName: string;
  defects: Defect[];
};

export const ReportDocument = ({ title, periodStart, periodEnd, authorName, defects }: ReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.orgTitle}>INFRASTRUCTURE MAINTENANCE AWARENESS TEAM</Text>
          <Text style={styles.subTitle}>Federal University of Technology, Akure (FUTA)</Text>
          <Text style={styles.subTitle}>Official Engineering Assessment Report</Text>
        </View>
      </View>

      <Text style={styles.reportTitle}>{title}</Text>

      {/* Meta Information */}
      <View style={styles.infoBox}>
        <View style={styles.infoCol}>
          <Text style={styles.label}>Reporting Period</Text>
          <Text style={styles.value}>{periodStart} TO {periodEnd}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.label}>Prepared By</Text>
          <Text style={styles.value}>{authorName}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.label}>Total Defects Included</Text>
          <Text style={styles.value}>{defects.length}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.label}>Document Status</Text>
          <Text style={styles.value}>FINALIZED</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>1. FIELD ASSESSMENT DETAILS</Text>

      {/* Defect Cards */}
      {defects.length === 0 ? (
        <Text style={styles.defectDetails}>No defects included in this report.</Text>
      ) : (
        defects.map((defect) => {
          let badgeStyle = styles.badge;
          if (defect.severity >= 4) badgeStyle = { ...styles.badge, ...styles.badgeCritical };
          else if (defect.severity === 3) badgeStyle = { ...styles.badge, ...styles.badgeWarning };

          return (
            <View wrap={false} key={defect.id} style={styles.defectCard}>
              <View style={styles.defectHeader}>
                <Text style={styles.defectTitle}>{defect.title} ({defect.campus_zones?.name || "Unmapped"})</Text>
                <Text style={badgeStyle}>LVL {defect.severity}</Text>
              </View>
              
              <Text style={styles.defectDetails}>{defect.description}</Text>
              
              {defect.photos && defect.photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {defect.photos.slice(0, 2).map((photo, i) => (
                    <PdfImage key={i} style={styles.photo} src={photo} />
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>IMAT-FUTA Official Report</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} />
      </View>
      
    </Page>
  </Document>
);
